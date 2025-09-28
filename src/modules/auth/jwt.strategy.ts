// src/modules/auth/jwt.strategy.ts
import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

function tokenFromQuery(req: Request): string | null {
  const raw = (req?.query as any)?.access_token;
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

function tokenFromCookie(req: Request): string | null {
  // Busca cookie "access_token" (opcional)
  const cookie = req?.headers?.cookie ?? '';
  const m = cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
  return m?.[1] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 1) Authorization: Bearer <token>
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // 2) Query param para SSE: ?access_token=<token>
        tokenFromQuery,
        // 3) (opcional) Cookie "access_token"
        tokenFromCookie,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'dev-secret',
      passReqToCallback: true, // nos permite loguear de dónde llegó el token
    });
  }

  // Con passReqToCallback:true => validate(req, payload)
  async validate(
    req: Request,
    payload: { sub: number; id?: number; email: string; role: string },
  ) {
    // Solo para debug en dev: muestra por dónde entró el token
    if (process.env.NODE_ENV !== 'production') {
      const hasHeader = !!ExtractJwt.fromAuthHeaderAsBearerToken()(req);
      const fromQuery = !!tokenFromQuery(req);
      const fromCookie = !!tokenFromCookie(req);
      const from = hasHeader ? 'header' : fromQuery ? 'query' : fromCookie ? 'cookie' : 'unknown';
      this.logger.debug(`JWT ok (${from}) -> sub=${payload.sub} role=${payload.role}`);
    }

    // Devolvemos ambos campos para máxima compatibilidad con código existente
    return {
      id: payload.id ?? payload.sub,
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
