import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto, RegisterRole } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';

const BCRYPT_ROUNDS = 12;
const REFRESH_DAYS = 30;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ── register

  async register(dto: RegisterDto) {
    const existing = await this.prisma.users.findFirst({
      where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
    });
    if (existing) throw new ConflictException('Email or phone already in use');

    const role = await this.prisma.roles.findFirst({
      where: { name: dto.role, deleted_at: null },
    });
    if (!role) throw new BadRequestException(`Role '${dto.role}' not found`);

    const password_hash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.users.create({
      data: {
        email: dto.email,
        password_hash,
        phone: dto.phone,
        role_id: role.id,
      },
    });

    // create role-specific profile
    await this.createProfile(user.id, dto);

    return { message: 'Registered successfully', user_id: user.id };
  }

  // ── login

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.users.findUnique({
      where: { email: dto.email },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    if (!user || !user.password_hash) throw new UnauthorizedException('Invalid credentials');
    if (!user.is_active) throw new UnauthorizedException('Account is disabled');

    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const permissions = user.role.permissions.map((rp) => rp.permission.name);
    const tokens = await this.issueTokens(user.id, user.email, user.role.name, permissions, {
      device_name: dto.device_name,
      ip_address: ip,
      user_agent: userAgent,
    });

    // update last login
    await this.prisma.users.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    return tokens;
  }

  // ── refresh

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const session = await this.prisma.user_sessions.findUnique({
      where: { jti: payload.jti },
    });

    if (!session || session.revoked) throw new UnauthorizedException('Session revoked');
    if (session.expires_at < new Date()) throw new UnauthorizedException('Session expired');

    // verify the stored hash matches
    const tokenHash = this.hashToken(refreshToken);
    if (session.token_hash !== tokenHash) throw new UnauthorizedException('Token mismatch');

    // rotate: revoke old session, issue new pair
    await this.prisma.user_sessions.update({
      where: { id: session.id },
      data: { revoked: true, revoked_at: new Date(), revoked_reason: 'rotated' },
    });

    const user = await this.prisma.users.findUniqueOrThrow({
      where: { id: session.user_id },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    const permissions = user.role.permissions.map((rp) => rp.permission.name);
    return this.issueTokens(user.id, user.email, user.role.name, permissions, {
      device_name: session.device_name ?? undefined,
      ip_address: session.ip_address ?? undefined,
      user_agent: session.user_agent ?? undefined,
    });
  }

  // ── logout

  async logout(jti: string) {
    await this.prisma.user_sessions.updateMany({
      where: { jti, revoked: false },
      data: { revoked: true, revoked_at: new Date(), revoked_reason: 'logout' },
    });
    return { message: 'Logged out' };
  }

  // ── sessions

  async getSessions(userId: string) {
    return this.prisma.user_sessions.findMany({
      where: { user_id: userId, revoked: false, expires_at: { gt: new Date() } },
      select: {
        id: true,
        device_name: true,
        ip_address: true,
        created_at: true,
        expires_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.user_sessions.findUnique({ where: { id: sessionId } });
    if (!session || session.user_id !== userId) throw new NotFoundException('Session not found');

    await this.prisma.user_sessions.update({
      where: { id: sessionId },
      data: { revoked: true, revoked_at: new Date(), revoked_by: userId, revoked_reason: 'user_revoked' },
    });
    return { message: 'Session revoked' };
  }

  // ── helpers

  private async issueTokens(
    userId: string,
    email: string,
    role: string,
    permissions: string[],
    meta: { device_name?: string; ip_address?: string; user_agent?: string },
  ) {
    const jti = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_DAYS);

    const payload: JwtPayload = { sub: userId, email, role, permissions, jti };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '10d') as any,
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: `${REFRESH_DAYS}d` as any,
    });

    await this.prisma.user_sessions.create({
      data: {
        user_id: userId,
        jti,
        token_hash: this.hashToken(refreshToken),
        device_name: meta.device_name,
        ip_address: meta.ip_address,
        user_agent: meta.user_agent,
        expires_at: expiresAt,
      },
    });

    return { access_token: accessToken, refresh_token: refreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async createProfile(userId: string, dto: RegisterDto) {
    switch (dto.role) {
      case RegisterRole.driver:
        await this.prisma.driver_profiles.create({
          data: { user_id: userId },
        });
        break;
      case RegisterRole.owner:
        await this.prisma.owner_profiles.create({
          data: { user_id: userId, business_name: dto.business_name, address: dto.address },
        });
        break;
      case RegisterRole.authority:
        await this.prisma.authority_profiles.create({
          data: { user_id: userId, organization: dto.organization, badge_number: dto.badge_number },
        });
        break;
    }
  }
}
