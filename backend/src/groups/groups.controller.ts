import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GroupsService, UpdateGroupDto } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@ApiTags('groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar grupos' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.groupsService.findAll(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de grupo' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.groupsService.findOne(id, user.tenantId);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Crear grupo' })
  create(
    @Body() dto: CreateGroupDto & { tenantId?: number },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { tenantId, ...rest } = dto;
    return this.groupsService.create(rest as CreateGroupDto, user.tenantId, user.userType, tenantId);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar grupo' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<UpdateGroupDto>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupsService.update(id, dto, user.tenantId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Miembros del grupo' })
  getMembers(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.groupsService.getMembers(id, user.tenantId);
  }

  @Post(':id/members')
  @Roles('admin')
  @ApiOperation({ summary: 'Agregar usuario al grupo' })
  addMember(
    @Param('id', ParseIntPipe) id: number,
    @Body('userId', ParseIntPipe) userId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupsService.addMember(id, userId, user.tenantId);
  }

  @Delete(':id/members/:userId')
  @Roles('admin')
  @ApiOperation({ summary: 'Quitar usuario del grupo' })
  removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupsService.removeMember(id, userId, user.tenantId);
  }
}
