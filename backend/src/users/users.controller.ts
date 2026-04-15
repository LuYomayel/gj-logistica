import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequiresPermission } from '../common/decorators/requires-permission.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequiresPermission('users.read')
  @ApiOperation({ summary: 'Listar usuarios' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findAll(user.tenantId);
  }

  @Get(':id')
  @RequiresPermission('users.read')
  @ApiOperation({ summary: 'Detalle de usuario' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findOne(id, user.tenantId);
  }

  @Post()
  @RequiresPermission('users.write')
  @ApiOperation({ summary: 'Crear usuario' })
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.create(dto, user.tenantId, user.userType);
  }

  @Patch(':id')
  @RequiresPermission('users.write')
  @ApiOperation({ summary: 'Actualizar usuario' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() requester: AuthenticatedUser,
  ) {
    return this.usersService.update(id, dto, requester);
  }

  @Delete(':id')
  @RequiresPermission('users.delete')
  @ApiOperation({ summary: 'Desactivar usuario' })
  deactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.deactivate(id, user.tenantId);
  }

  @Patch(':id/activate')
  @RequiresPermission('users.write')
  @ApiOperation({ summary: 'Reactivar usuario desactivado' })
  activate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.activate(id, user.tenantId);
  }

  @Patch(':id/change-password')
  @ApiOperation({ summary: 'Cambiar contraseña (propia o de otro usuario con permiso users.write_password)' })
  changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangePasswordDto,
    @CurrentUser() requester: AuthenticatedUser,
  ) {
    return this.usersService.changePassword(id, dto, requester);
  }

  @Get(':id/groups')
  @RequiresPermission('users.read')
  @ApiOperation({ summary: 'Grupos del usuario' })
  getUserGroups(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getUserGroups(id, user.tenantId);
  }
}
