// src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../modules/users/user.entity'; // <-- enum

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// (opcional) si querés un alias de tipo
export type RoleType = UserRole;
