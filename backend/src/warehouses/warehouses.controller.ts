import {
  Controller, Get, Post, Patch, Param, Body, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Listar almacenes' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findAll(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de almacén' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @RequiresPermission('stock.write_warehouses')
  @ApiOperation({ summary: 'Crear almacén' })
  create(
    @Body() dto: CreateWarehouseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user.id, user.tenantId);
  }

  @Patch(':id')
  @RequiresPermission('stock.write_warehouses')
  @ApiOperation({ summary: 'Actualizar almacén' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<UpdateWarehouseDto>) {
    return this.service.update(id, dto);
  }

  @Get(':id/stock')
  @RequiresPermission('stock.read')
  @ApiOperation({ summary: 'Stock actual del almacén por producto' })
  getStock(@Param('id', ParseIntPipe) id: number) {
    return this.service.getStock(id);
  }
}
