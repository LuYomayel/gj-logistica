import {
  Controller, Get, Post, Patch, Param, Body, ParseIntPipe, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WarehousesService, UpdateWarehouseDto } from './warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequiresPermission } from '../common/decorators/requires-permission.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@ApiTags('warehouses')
@ApiBearerAuth()
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly service: WarehousesService) {}

  @Get()
  @RequiresPermission('stock.read')
  @ApiOperation({ summary: 'Listar almacenes (del tenant del usuario; super_admin ve todos)' })
  @ApiQuery({ name: 'tenantId', required: false, description: 'Filtro por tenant (solo super_admin)' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('tenantId') tenantIdRaw?: string,
  ) {
    const filterTenantId = tenantIdRaw ? Number(tenantIdRaw) : undefined;
    return this.service.findAll(user.tenantId, Number.isFinite(filterTenantId) ? filterTenantId : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de almacén' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findOne(id, user.tenantId);
  }

  @Post()
  @RequiresPermission('stock.write_warehouses')
  @ApiOperation({ summary: 'Crear almacén' })
  create(
    @Body() dto: CreateWarehouseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user.id, user.tenantId, user.userType);
  }

  @Patch(':id')
  @RequiresPermission('stock.write_warehouses')
  @ApiOperation({ summary: 'Actualizar almacén' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<UpdateWarehouseDto>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user.tenantId, user.userType);
  }

  @Get(':id/stock')
  @RequiresPermission('stock.read')
  @ApiOperation({ summary: 'Stock actual del almacén por producto' })
  getStock(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getStock(id, user.tenantId);
  }
}
