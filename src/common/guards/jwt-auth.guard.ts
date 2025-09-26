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
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;


    const req = context.switchToHttp().getRequest();
    const accessToken =
      req?.query?.access_token ||
      req?.query?.token ||
      req?.headers?.['x-access-token'];
    if (accessToken && !req.headers?.authorization) {
      req.headers.authorization = `Bearer ${
        Array.isArray(accessToken) ? accessToken[0] : accessToken
      }`;
    }

    return super.canActivate(context);
  }
}
