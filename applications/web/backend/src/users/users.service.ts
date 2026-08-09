import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(user: JwtPayload) {
        if (user.role === 'admin') {
            const users = await this.prisma.users.findMany({
                where: { deleted_at: null },
                select: this.userSelect(),
                orderBy: { created_at: 'desc' },
            });

            return users.map((entry) => this.serializeUser(entry));
        }

        return [await this.findOne(user.sub, user)];
    }

    async findOne(id: string, user: JwtPayload) {
        if (user.role !== 'admin' && id !== user.sub) {
            throw new ForbiddenException('You can only access your own account');
        }

        const record = await this.prisma.users.findFirst({
            where: { id, deleted_at: null },
            select: this.userSelect(),
        });

        if (!record) {
            throw new NotFoundException('User not found');
        }

        return this.serializeUser(record);
    }

    async update(id: string, dto: UpdateUserDto, user: JwtPayload) {
        if (user.role !== 'admin' && id !== user.sub) {
            throw new ForbiddenException('You can only update your own account');
        }

        const existing = await this.prisma.users.findFirst({
            where: { id, deleted_at: null },
            select: { id: true },
        });

        if (!existing) {
            throw new NotFoundException('User not found');
        }

        const data: Record<string, unknown> = {};

        if (dto.full_name !== undefined) {
            data.full_name = dto.full_name;
        }

        if (dto.phone !== undefined) {
            data.phone = dto.phone;
        }

        if (dto.avatar_url !== undefined) {
            data.avatar_url = dto.avatar_url;
        }

        if (Object.keys(data).length > 0) {
            await this.prisma.users.update({
                where: { id },
                data,
            });
        }

        return this.findOne(id, user);
    }

    private userSelect() {
        return {
            id: true,
            email: true,
            full_name: true,
            phone: true,
            avatar_url: true,
            is_active: true,
            created_at: true,
            updated_at: true,
            role: {
                select: {
                    name: true,
                },
            },
            owner_profile: {
                select: {
                    business_name: true,
                    address: true,
                },
            },
            driver_profile: {
                select: {
                    driving_licence_no: true,
                    licence_type: true,
                },
            },
            authority_profile: {
                select: {
                    organization: true,
                    badge_number: true,
                },
            },
        };
    }

    private serializeUser(user: any) {
        return {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            phone: user.phone,
            avatar_url: user.avatar_url,
            is_active: user.is_active,
            created_at: user.created_at,
            updated_at: user.updated_at,
            role: user.role?.name ?? null,
            profile: {
                owner: user.owner_profile
                    ? {
                        business_name: user.owner_profile.business_name ?? null,
                        address: user.owner_profile.address ?? null,
                    }
                    : null,
                driver: user.driver_profile
                    ? {
                        driving_licence_no: user.driver_profile.driving_licence_no ?? null,
                        licence_type: user.driver_profile.licence_type ?? null,
                    }
                    : null,
                authority: user.authority_profile
                    ? {
                        organization: user.authority_profile.organization ?? null,
                        badge_number: user.authority_profile.badge_number ?? null,
                    }
                    : null,
            },
        };
    }
}
