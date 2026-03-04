import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Permission } from '../entities/permission.entity';
import { PermissionGroup } from '../entities/permission-group.entity';
import { PermissionGroupItem } from '../entities/permission-group-item.entity';
import { UserPermissionGroup } from '../entities/user-permission-group.entity';
import { UserPermission } from '../entities/user-permission.entity';
import { User } from '../entities/user.entity';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreatePermissionGroupDto } from './dto/create-permission-group.dto';
import { UpdatePermissionGroupDto } from './dto/update-permission-group.dto';
import { SetUserPermissionDto } from './dto/set-user-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,
    @InjectRepository(PermissionGroup)
    private readonly groupRepo: Repository<PermissionGroup>,
    @InjectRepository(PermissionGroupItem)
    private readonly groupItemRepo: Repository<PermissionGroupItem>,
    @InjectRepository(UserPermissionGroup)
    private readonly userGroupRepo: Repository<UserPermissionGroup>,
    @InjectRepository(UserPermission)
    private readonly userPermRepo: Repository<UserPermission>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ── Permission Catalog ──────────────────────────────────────────────────────

  /** Returns all permissions grouped by module */
  async getCatalog(): Promise<Record<string, Permission[]>> {
    const perms = await this.permRepo.find({
      where: { isActive: true },
      order: { module: 'ASC', action: 'ASC' },
    });
    return perms.reduce<Record<string, Permission[]>>((acc, p) => {
      if (!acc[p.module]) acc[p.module] = [];
      acc[p.module].push(p);
      return acc;
    }, {});
  }

  // ── Permission Groups ───────────────────────────────────────────────────────

  async findGroups(requestingUser: AuthenticatedUser): Promise<PermissionGroup[]> {
    const qb = this.groupRepo.createQueryBuilder('pg');
    if (requestingUser.userType !== 'super_admin') {
      qb.where('pg.tenantId = :tenantId', { tenantId: requestingUser.tenantId });
    }
    return qb.orderBy('pg.name', 'ASC').getMany();
  }

  async findGroupById(id: number, requestingUser: AuthenticatedUser): Promise<PermissionGroup> {
    const group = await this.groupRepo.findOne({ where: { id } });
    if (!group) throw new NotFoundException(`Permission group #${id} not found`);
    this.assertTenantAccess(group.tenantId, requestingUser);
    return group;
  }

  async createGroup(
    dto: CreatePermissionGroupDto,
    requestingUser: AuthenticatedUser,
  ): Promise<PermissionGroup> {
    const tenantId =
      requestingUser.userType === 'super_admin' ? null : requestingUser.tenantId;
    const group = this.groupRepo.create({
      ...dto,
      tenantId,
      isActive: dto.isActive ?? true,
    });
    return this.groupRepo.save(group);
  }

  async updateGroup(
    id: number,
    dto: UpdatePermissionGroupDto,
    requestingUser: AuthenticatedUser,
  ): Promise<PermissionGroup> {
    const group = await this.findGroupById(id, requestingUser);
    Object.assign(group, dto);
    return this.groupRepo.save(group);
  }

  async deleteGroup(id: number, requestingUser: AuthenticatedUser): Promise<void> {
    const group = await this.findGroupById(id, requestingUser);
    await this.groupRepo.remove(group);
  }

  // ── Group Permissions ───────────────────────────────────────────────────────

  async getGroupPermissions(
    groupId: number,
    requestingUser: AuthenticatedUser,
  ): Promise<Permission[]> {
    await this.findGroupById(groupId, requestingUser);
    const items = await this.groupItemRepo.find({ where: { groupId } });
    if (!items.length) return [];
    const permIds = items.map((i) => i.permissionId);
    return this.permRepo.findByIds(permIds);
  }

  async addPermissionToGroup(
    groupId: number,
    permissionId: number,
    requestingUser: AuthenticatedUser,
  ): Promise<void> {
    await this.findGroupById(groupId, requestingUser);
    const perm = await this.permRepo.findOne({ where: { id: permissionId } });
    if (!perm) throw new NotFoundException(`Permission #${permissionId} not found`);
    const existing = await this.groupItemRepo.findOne({ where: { groupId, permissionId } });
    if (existing) return; // idempotent
    await this.groupItemRepo.save(this.groupItemRepo.create({ groupId, permissionId }));
  }

  async removePermissionFromGroup(
    groupId: number,
    permissionId: number,
    requestingUser: AuthenticatedUser,
  ): Promise<void> {
    await this.findGroupById(groupId, requestingUser);
    const item = await this.groupItemRepo.findOne({ where: { groupId, permissionId } });
    if (!item) throw new NotFoundException(`Permission #${permissionId} not in group #${groupId}`);
    await this.groupItemRepo.remove(item);
  }

  // ── Group Members ───────────────────────────────────────────────────────────

  async getGroupMembers(
    groupId: number,
    requestingUser: AuthenticatedUser,
  ): Promise<User[]> {
    await this.findGroupById(groupId, requestingUser);
    const memberships = await this.userGroupRepo.find({ where: { groupId } });
    if (!memberships.length) return [];
    const userIds = memberships.map((m) => m.userId);
    return this.userRepo.find({
      where: { id: In(userIds) },
      select: ['id', 'username', 'email', 'userType', 'entity'],
    });
  }

  async addMemberToGroup(
    groupId: number,
    userId: number,
    requestingUser: AuthenticatedUser,
  ): Promise<void> {
    await this.findGroupById(groupId, requestingUser);
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User #${userId} not found`);
    // Ensure user belongs to same tenant (unless super_admin)
    if (
      requestingUser.userType !== 'super_admin' &&
      user.entity !== requestingUser.tenantId
    ) {
      throw new ForbiddenException('Cannot add user from a different tenant');
    }
    const existing = await this.userGroupRepo.findOne({ where: { groupId, userId } });
    if (existing) return; // idempotent
    const membership = this.userGroupRepo.create({ groupId, userId });
    await this.userGroupRepo.save(membership);
  }

  async removeMemberFromGroup(
    groupId: number,
    userId: number,
    requestingUser: AuthenticatedUser,
  ): Promise<void> {
    await this.findGroupById(groupId, requestingUser);
    const membership = await this.userGroupRepo.findOne({ where: { groupId, userId } });
    if (!membership) throw new NotFoundException(`User #${userId} is not a member of group #${groupId}`);
    await this.userGroupRepo.remove(membership);
  }

  // ── User Permissions (overrides) ────────────────────────────────────────────

  async getUserEffectivePermissions(
    userId: number,
    requestingUser: AuthenticatedUser,
  ): Promise<{ effective: string[]; overrides: UserPermission[] }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User #${userId} not found`);
    this.assertTenantAccess(user.entity, requestingUser);

    const memberships = await this.userGroupRepo.find({ where: { userId } });
    let permissionIds: number[] = [];
    if (memberships.length) {
      const groupIds = memberships.map((m) => m.groupId);
      const items = await this.groupItemRepo
        .createQueryBuilder('pgi')
        .where('pgi.groupId IN (:...groupIds)', { groupIds })
        .getMany();
      permissionIds = [...new Set(items.map((i) => i.permissionId))];
    }

    const overrides = await this.userPermRepo.find({ where: { userId } });
    for (const override of overrides) {
      if (override.granted && !permissionIds.includes(override.permissionId)) {
        permissionIds.push(override.permissionId);
      } else if (!override.granted) {
        permissionIds = permissionIds.filter((id) => id !== override.permissionId);
      }
    }

    let effective: string[] = [];
    if (permissionIds.length) {
      const perms = await this.permRepo.findByIds(permissionIds);
      effective = perms.map((p) => `${p.module}.${p.action}`);
    }

    return { effective, overrides };
  }

  async setUserPermission(
    userId: number,
    dto: SetUserPermissionDto,
    requestingUser: AuthenticatedUser,
  ): Promise<UserPermission> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User #${userId} not found`);
    this.assertTenantAccess(user.entity, requestingUser);

    const perm = await this.permRepo.findOne({ where: { id: dto.permissionId } });
    if (!perm) throw new NotFoundException(`Permission #${dto.permissionId} not found`);

    let up = await this.userPermRepo.findOne({
      where: { userId, permissionId: dto.permissionId },
    });
    if (up) {
      up.granted = dto.granted;
    } else {
      up = this.userPermRepo.create({ userId, permissionId: dto.permissionId, granted: dto.granted });
    }
    return this.userPermRepo.save(up);
  }

  async removeUserPermission(
    userId: number,
    permissionId: number,
    requestingUser: AuthenticatedUser,
  ): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User #${userId} not found`);
    this.assertTenantAccess(user.entity, requestingUser);

    const up = await this.userPermRepo.findOne({ where: { userId, permissionId } });
    if (!up) throw new NotFoundException(`Override not found for user #${userId}, permission #${permissionId}`);
    await this.userPermRepo.remove(up);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private assertTenantAccess(
    resourceTenantId: number | null,
    requestingUser: AuthenticatedUser,
  ): void {
    if (requestingUser.userType === 'super_admin') return;
    if (resourceTenantId !== null && resourceTenantId !== requestingUser.tenantId) {
      throw new ForbiddenException('Access denied: resource belongs to a different tenant');
    }
  }
}
