import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InventoriesService } from './inventories.service';
import {
  CreateInventoryDto, AddInventoryLineDto, UpdateInventoryLineDto, FilterInventoryDto,
} from './dto/create-inventory.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequiresPermission } from '../common/decorators/requires-permission.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@ApiTags('inventories')
@ApiBearerAuth()
@Controller('inventories')
export class InventoriesController {
  constructor(private readonly service: InventoriesService) {}

  @Get()
  @RequiresPermission('stock.read')
  @ApiOperation({ summary: 'Listar inventarios físicos' })
  findAll(
    @Query() filter: FilterInventoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findAll(filter, user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de inventario con líneas' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findOne(id, user.tenantId);
  }

  @Post()
  @RequiresPermission('stock.write_inventories')
  @ApiOperation({ summary: 'Crear inventario' })
  create(
    @Body() dto: CreateInventoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user.id, user.tenantId, user.userType);
  }

  @Post(':id/lines')
  @RequiresPermission('stock.write_inventories')
  @ApiOperation({ summary: 'Agregar línea al inventario' })
  addLine(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddInventoryLineDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.addLine(id, dto, user.id, user.tenantId);
  }

  @Patch(':id/lines/:lineId')
  @RequiresPermission('stock.write_inventories')
  @ApiOperation({ summary: 'Actualizar cantidad real de una línea' })
  updateLine(
    @Param('id', ParseIntPipe) id: number,
    @Param('lineId', ParseIntPipe) lineId: number,
    @Body() dto: UpdateInventoryLineDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateLine(id, lineId, dto, user.tenantId);
  }

  @Delete(':id/lines/:lineId')
  @RequiresPermission('stock.write_inventories')
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar línea del inventario' })
  removeLine(
    @Param('id', ParseIntPipe) id: number,
    @Param('lineId', ParseIntPipe) lineId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.removeLine(id, lineId, user.tenantId);
  }

  @Post(':id/validate')
  @RequiresPermission('stock.write_inventories')
  @ApiOperation({ summary: 'Generar movimientos y cerrar inventario' })
  validate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.validate(id, user.id, user.tenantId);
  }

  @Post(':id/reset')
  @RequiresPermission('stock.write_inventories')
  @ApiOperation({ summary: 'Volver inventario a borrador' })
  reset(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.resetToDraft(id, user.tenantId, user.id);
  }

  @Delete(':id')
  @RequiresPermission('stock.write_inventories')
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar inventario en borrador' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.remove(id, user.tenantId);
  }
}
