import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'requiredPermissions';

/**
 * Declares which fine-grained permission(s) are required to access a route.
 *
 * Format: '<module>.<action>'
 * Examples:
 *   @RequiresPermission('orders.read')
 *   @RequiresPermission('orders.validate', 'orders.write')
 *
 * super_admin and client_admin bypass all permission checks.
 * client_user must have ALL listed permissions via their permission groups or direct grants.
 *
 * If no @RequiresPermission is set on a route, the route is accessible to any authenticated user
 * (still subject to tenant isolation in the service layer).
 */
export const RequiresPermission = (...permissions: string[]) =>
  SetMetadata(PERMISSION_KEY, permissions);
