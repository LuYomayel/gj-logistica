import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InventoriesService } from './inventories.service';
import {
  CreateInventoryDto, AddInventoryLineDto, UpdateInventoryLineDto, FilterInventoryDto,
} from './dto/create-inventory.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('inventories')
@ApiBearerAuth()
@Controller('inventories')
export class InventoriesController {
  constructor(private readonly service: InventoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar inventarios físicos' })
  findAll(@Query() filter: FilterInventoryDto) {
    return this.service.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de inventario con líneas' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('admin', 'comunicacion')
  @ApiOperation({ summary: 'Crear inventario' })
  create(@Body() dto: CreateInventoryDto, @CurrentUser() user: { id: number }) {
    return this.service.create(dto, user.id);
  }

  @Post(':id/lines')
  @Roles('admin', 'comunicacion')
  @ApiOperation({ summary: 'Agregar línea al inventario' })
  addLine(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddInventoryLineDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.service.addLine(id, dto, user.id);
  }

  @Patch(':id/lines/:lineId')
  @Roles('admin', 'comunicacion')
  @ApiOperation({ summary: 'Actualizar cantidad real de una línea' })
  updateLine(
    @Param('id', ParseIntPipe) id: number,
    @Param('lineId', ParseIntPipe) lineId: number,
    @Body() dto: UpdateInventoryLineDto,
  ) {
    return this.service.updateLine(id, lineId, dto);
  }

  @Delete(':id/lines/:lineId')
  @Roles('admin', 'comunicacion')
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar línea del inventario' })
  removeLine(
    @Param('id', ParseIntPipe) id: number,
    @Param('lineId', ParseIntPipe) lineId: number,
  ) {
    return this.service.removeLine(id, lineId);
  }

  @Post(':id/validate')
  @Roles('admin', 'comunicacion')
  @ApiOperation({ summary: 'Generar movimientos y cerrar inventario' })
  validate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { id: number }) {
    return this.service.validate(id, user.id);
  }

  @Post(':id/reset')
  @Roles('admin')
  @ApiOperation({ summary: 'Volver inventario a borrador' })
  reset(@Param('id', ParseIntPipe) id: number) {
    return this.service.resetToDraft(id);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar inventario en borrador' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
