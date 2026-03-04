import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../../common/decorators/requires-permission.decorator';
import type { AuthenticatedUser } from '../strategies/jwt.strategy';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @RequiresPermission → route is accessible to any authenticated user
    if (!required || required.length === 0) return true;

    const user: AuthenticatedUser | undefined =
      context.switchToHttp().getRequest().user;

    if (!user) return false;

    // Permissions restricted to super_admin ONLY — even client_admin with '*' is blocked
    const SUPER_ADMIN_ONLY = new Set(['tenants.read', 'tenants.write']);
    const needsSuperAdmin = required.some((p) => SUPER_ADMIN_ONLY.has(p));
    if (needsSuperAdmin) {
      if (user.userType !== 'super_admin') {
        throw new ForbiddenException('Solo super_admin puede acceder a esta función');
      }
      return true;
    }

    // super_admin & client_admin have wildcard access for non-admin permissions
    if (user.permissions.includes('*')) return true;

    // client_user must possess ALL required permissions
    const hasAll = required.every((perm) => user.permissions.includes(perm));
    if (!hasAll) {
      const missing = required.filter((p) => !user.permissions.includes(p));
      throw new ForbiddenException(
        `Permiso insuficiente. Requerido: ${missing.join(', ')}`,
      );
    }

    return true;
  }
}
