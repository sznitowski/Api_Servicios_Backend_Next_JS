// src/modules/auth/jwt.strategy.ts
import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'dev-secret'),
    });
  }

  async validate(payload: { sub: number; email: string; role: string }) {
    // DEBUG (temporal): para confirmar que el guard dejó pasar el token
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`JWT ok -> sub=${payload.sub} role=${payload.role}`);
    }

    // devolvemos el shape que usa el resto del código
    return { sub: payload.sub, email: payload.email, role: payload.role };
  }
}
