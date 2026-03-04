import {
  Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe,
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { CreatePermissionGroupDto } from './dto/create-permission-group.dto';
import { UpdatePermissionGroupDto } from './dto/update-permission-group.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { SetUserPermissionDto } from './dto/set-user-permission.dto';
import { RequiresPermission } from '../common/decorators/requires-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller()
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  // ── Permission Catalog ─────────────────────────────────────────────────────

  @Get('permissions')
  getCatalog() {
    return this.permissionsService.getCatalog();
  }

  // ── Permission Groups ──────────────────────────────────────────────────────

  @Get('permission-groups')
  @RequiresPermission('users.read_groups')
  findGroups(@CurrentUser() user: AuthenticatedUser) {
    return this.permissionsService.findGroups(user);
  }

  @Get('permission-groups/:id')
  @RequiresPermission('users.read_groups')
  findGroupById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.permissionsService.findGroupById(id, user);
  }

  @Post('permission-groups')
  @RequiresPermission('users.write_groups')
  createGroup(
    @Body() dto: CreatePermissionGroupDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.permissionsService.createGroup(dto, user);
  }

  @Patch('permission-groups/:id')
  @RequiresPermission('users.write_groups')
  updateGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePermissionGroupDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.permissionsService.updateGroup(id, dto, user);
  }

  @Delete('permission-groups/:id')
  @RequiresPermission('users.delete_groups')
  deleteGroup(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.permissionsService.deleteGroup(id, user);
  }

  // ── Group Permissions ──────────────────────────────────────────────────────

  @Get('permission-groups/:id/permissions')
  @RequiresPermission('users.read_group_perms')
  getGroupPermissions(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.permissionsService.getGroupPermissions(id, user);
  }

  @Post('permission-groups/:id/permissions/:permId')
  @RequiresPermission('users.write_groups')
  addPermissionToGroup(
    @Param('id', ParseIntPipe) id: number,
    @Param('permId', ParseIntPipe) permId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.permissionsService.addPermissionToGroup(id, permId, user);
  }

  @Delete('permission-groups/:id/permissions/:permId')
  @RequiresPermission('users.write_groups')
  removePermissionFromGroup(
    @Param('id', ParseIntPipe) id: number,
    @Param('permId', ParseIntPipe) permId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.permissionsService.removePermissionFromGroup(id, permId, user);
  }

  // ── Group Members ──────────────────────────────────────────────────────────

  @Get('permission-groups/:id/members')
  @RequiresPermission('users.read_groups')
  getGroupMembers(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.permissionsService.getGroupMembers(id, user);
  }

  @Post('permission-groups/:id/members')
  @RequiresPermission('users.write_groups')
  addMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.permissionsService.addMemberToGroup(id, dto.userId, user);
  }

  @Delete('permission-groups/:id/members/:userId')
  @RequiresPermission('users.write_groups')
  removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.permissionsService.removeMemberFromGroup(id, userId, user);
  }

  // ── User Permissions ───────────────────────────────────────────────────────

  @Get('users/:userId/permissions')
  @RequiresPermission('users.read_permissions')
  getUserEffectivePermissions(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.permissionsService.getUserEffectivePermissions(userId, user);
  }

  @Post('users/:userId/permissions')
  @RequiresPermission('users.write')
  setUserPermission(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: SetUserPermissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.permissionsService.setUserPermission(userId, dto, user);
  }

  @Delete('users/:userId/permissions/:permId')
  @RequiresPermission('users.write')
  removeUserPermission(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('permId', ParseIntPipe) permId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.permissionsService.removeUserPermission(userId, permId, user);
  }
}
