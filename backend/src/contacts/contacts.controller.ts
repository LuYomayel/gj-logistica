import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ContactsService, UpdateContactDto } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequiresPermission } from '../common/decorators/requires-permission.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@ApiTags('contacts')
@ApiBearerAuth()
@Controller('contacts')
export class ContactsController {
  constructor(private readonly service: ContactsService) {}

  @Get()
  @RequiresPermission('contacts.read')
  @ApiOperation({ summary: 'Listar contactos' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'thirdPartyId', required: false })
  findAll(
    @Query('search') search?: string,
    @Query('thirdPartyId') thirdPartyId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const tpId = thirdPartyId ? Number(thirdPartyId) : undefined;
    return this.service.findAll(search, user?.tenantId ?? null, tpId);
  }

  @Get(':id')
  @RequiresPermission('contacts.read')
  @ApiOperation({ summary: 'Detalle de contacto' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findOne(id, user.tenantId);
  }

  @Post()
  @RequiresPermission('contacts.write')
  @ApiOperation({ summary: 'Crear contacto' })
  create(
    @Body() dto: CreateContactDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user.tenantId, user.userType);
  }

  @Patch(':id')
  @RequiresPermission('contacts.write')
  @ApiOperation({ summary: 'Actualizar contacto' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<UpdateContactDto>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user.tenantId, user.userType);
  }

  @Post(':id/deactivate')
  @RequiresPermission('contacts.delete')
  @ApiOperation({ summary: 'Desactivar contacto (soft)' })
  deactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.service.deactivate(id, user.tenantId);
  }

  @Post(':id/activate')
  @RequiresPermission('contacts.write')
  @ApiOperation({ summary: 'Reactivar contacto' })
  activate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.service.activate(id, user.tenantId);
  }

  @Delete(':id')
  @RequiresPermission('contacts.delete')
  @ApiOperation({ summary: 'Eliminar contacto permanentemente' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user.tenantId);
  }
}
