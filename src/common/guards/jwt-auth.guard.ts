// src/common/guards/jwt-auth.guard.ts
import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // 1) Endpoints públicos
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // 2) Intenta levantar el token desde fuentes alternativas
    const req = context.switchToHttp().getRequest();

    // Si ya viene Authorization, no tocamos nada
    const hasAuthHeader =
      typeof req.headers?.authorization === 'string' &&
      req.headers.authorization.trim().length > 0;

    if (!hasAuthHeader) {
      // soporta query, header custom y cookies
      const q = req?.query ?? {};
      const h = req?.headers ?? {};
      const c = req?.cookies ?? {};

      const candidate =
        (Array.isArray(q.access_token) ? q.access_token[0] : q.access_token) ||
        (Array.isArray(q.token) ? q.token[0] : q.token) ||
        (Array.isArray(h['x-access-token']) ? h['x-access-token'][0] : h['x-access-token']) ||
        (Array.isArray(c?.access_token) ? c.access_token[0] : c?.access_token) ||
        (Array.isArray(c?.token) ? c.token[0] : c?.token);

      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        req.headers.authorization = `Bearer ${candidate}`;
      }
    }

    // 3) Delega en Passport
    return super.canActivate(context);
  }
}
