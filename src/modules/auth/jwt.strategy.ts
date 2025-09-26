// src/modules/auth/jwt.strategy.ts
import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, VerifiedCallback } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly config: ConfigService) {
    // Extractor mixto: Header Bearer o query ?access_token=
    const fromHeader = ExtractJwt.fromAuthHeaderAsBearerToken();
    const fromQueryParam = (req: Request) => {
      const raw = (req?.query as any)?.access_token;
      return typeof raw === 'string' && raw.length > 0 ? raw : null;
    };
    const mixedExtractor = (req: Request) => fromHeader(req) || fromQueryParam(req);

    super({
      jwtFromRequest: mixedExtractor,
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'dev-secret',
      passReqToCallback: true,
    });
  }

  // Con passReqToCallback:true => validate(req, payload)
  async validate(req: Request, payload: { sub: number; email: string; role: string }) {
    // Log de ayuda para confirmar por dónde entró el token
    const hasHeader = !!ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    const from = hasHeader ? 'header' : ((req?.query as any)?.access_token ? 'query' : 'unknown');

    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`JWT ok (${from}) -> sub=${payload.sub} role=${payload.role}`);
    }

    // Lo que se inyecta en req.user
    return { sub: payload.sub, email: payload.email, role: payload.role };
  }
}
