import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

export interface JwtPayload {
  sub: number;
  username: string;
}

/** Shape of request.user after JWT validation */
export interface AuthenticatedUser {
  id: number;
  username: string;
  email: string | null;
  isAdmin: boolean;
  userType: 'super_admin' | 'client_admin' | 'client_user';
  /** null for super_admin; corresponds to users.entity column for tenants */
  tenantId: number | null;
  /**
   * Effective permissions as 'module.action' strings.
   * ['*'] = bypass all permission checks (super_admin / client_admin).
   */
  permissions: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'default-secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.userRepo.findOne({
      where: { id: payload.sub, status: 1 },
    });
    if (!user) throw new UnauthorizedException();

    const tenantId: number | null =
      user.userType === 'super_admin' ? null : user.entity;

    let permissions: string[];

    if (user.userType === 'super_admin' || user.userType === 'client_admin') {
      // Full access — bypass all permission checks
      permissions = ['*'];
    } else {
      // client_user: load effective permissions from groups + direct overrides
      permissions = await this.loadEffectivePermissions(user.id);
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      userType: user.userType,
      tenantId,
      permissions,
    };
  }

  /**
   * Compute effective permissions for a client_user:
   * 1. Collect all permissions from their permission groups
   * 2. Apply direct user-level overrides (grant or deny)
   */
  private async loadEffectivePermissions(userId: number): Promise<string[]> {
    // Load all group-based permissions in a single JOIN query
    const groupPerms: Array<{ module: string; action: string }> =
      await this.userRepo.manager.query(
        `SELECT DISTINCT p.module, p.action
         FROM user_permission_groups upg
         JOIN permission_group_items pgi ON pgi.groupId = upg.groupId
         JOIN permissions p ON p.id = pgi.permissionId AND p.isActive = 1
         WHERE upg.userId = ?`,
        [userId],
      );

    const permSet = new Set<string>(
      groupPerms.map((p) => `${p.module}.${p.action}`),
    );

    // Apply direct user-level overrides
    const overrides: Array<{ module: string; action: string; granted: number }> =
      await this.userRepo.manager.query(
        `SELECT p.module, p.action, up.granted
         FROM user_permissions up
         JOIN permissions p ON p.id = up.permissionId AND p.isActive = 1
         WHERE up.userId = ?`,
        [userId],
      );

    for (const o of overrides) {
      const key = `${o.module}.${o.action}`;
      if (o.granted) {
        permSet.add(key);
      } else {
        permSet.delete(key); // explicit deny overrides group grant
      }
    }

    return Array.from(permSet);
  }
}
