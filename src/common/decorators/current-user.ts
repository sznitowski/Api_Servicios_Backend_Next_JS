// src/common/decorators/current-user.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Si prefieres no depender del enum, déjalo como union literal:
export type JwtUserRole = 'CLIENT' | 'PROVIDER' | 'ADMIN';

export interface JwtUser {
  sub: number;           // user id
  email: string;
  role: JwtUserRole;     // o: UserRole si quieres importar el enum
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as JwtUser; // viene de JwtStrategy.validate()
  },
);
