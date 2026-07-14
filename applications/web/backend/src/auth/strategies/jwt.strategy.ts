import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;         // user id
  email: string;
  role: string;
  permissions: string[];
  jti: string;         // session id — used to check revocation
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // passport calls this after verifying the signature
  validate(payload: JwtPayload) {
    if (!payload.sub) throw new UnauthorizedException();
    return payload; // attached to req.user
  }
}
