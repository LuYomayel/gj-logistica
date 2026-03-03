import {
  Controller, Get, Post, Patch, Body, Query,
  Param, ParseIntPipe, HttpCode, HttpStatus, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, AddOrderLineDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { FilterOrderDto, OrderStatsDto } from './dto/filter-order.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar pedidos (paginado, filtros)' })
  findAll(@Query() filter: FilterOrderDto) {
    return this.service.findAll(filter);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de pedidos: por mes/año y por estado' })
  getStats(@Query() filter: OrderStatsDto) {
    return this.service.getStats(filter);
  }

  @Get('export')
  @ApiOperation({ summary: 'Exportar pedidos como CSV (con líneas)' })
  async exportCsv(@Query() filter: FilterOrderDto, @Res() res: Response) {
    const csv = await this.service.exportCsv(filter);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="pedidos.csv"');
    res.send('\uFEFF' + csv); // BOM prefix for Excel UTF-8 compatibility
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener pedido por ID con líneas' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('admin', 'comunicacion', 'comercial')
  @ApiOperation({ summary: 'Crear pedido en borrador' })
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @Roles('admin', 'comunicacion', 'comercial')
  @ApiOperation({ summary: 'Editar pedido borrador' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.service.update(id, dto);
  }

  @Post(':id/lines')
  @Roles('admin', 'comunicacion', 'comercial')
  @ApiOperation({ summary: 'Agregar línea a pedido borrador' })
  addLine(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddOrderLineDto,
  ) {
    return this.service.addLine(id, dto);
  }

  @Patch(':id/lines/:lineId/remove')
  @Roles('admin', 'comunicacion', 'comercial')
  @ApiOperation({ summary: 'Eliminar línea de pedido borrador' })
  removeLine(
    @Param('id', ParseIntPipe) id: number,
    @Param('lineId', ParseIntPipe) lineId: number,
  ) {
    return this.service.removeLine(id, lineId);
  }

  @Post(':id/validate')
  @Roles('admin', 'comunicacion', 'comercial')
  @ApiOperation({ summary: 'Validar pedido (descuenta stock, genera ref SOyymm-nnnn)' })
  @HttpCode(HttpStatus.OK)
  validateOrder(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
  ) {
    return this.service.validateOrder(id, user.id);
  }

  @Post(':id/cancel')
  @Roles('admin', 'comunicacion', 'comercial')
  @ApiOperation({ summary: 'Cancelar pedido (revierte stock si estaba validado)' })
  @HttpCode(HttpStatus.OK)
  cancelOrder(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
  ) {
    return this.service.cancelOrder(id, user.id);
  }

  @Post(':id/progress')
  @Roles('admin', 'comunicacion', 'comercial')
  @ApiOperation({ summary: 'Pasar pedido a EN PROCESO (status=2)' })
  @HttpCode(HttpStatus.OK)
  progressOrder(@Param('id', ParseIntPipe) id: number) {
    return this.service.progressOrder(id);
  }

  @Post(':id/ship')
  @Roles('admin', 'comunicacion', 'comercial')
  @ApiOperation({ summary: 'Marcar pedido como DESPACHADO (status=3)' })
  @HttpCode(HttpStatus.OK)
  shipOrder(@Param('id', ParseIntPipe) id: number) {
    return this.service.shipOrder(id);
  }

  @Post(':id/clone')
  @Roles('admin', 'comunicacion', 'comercial')
  @ApiOperation({ summary: 'Clonar pedido como nuevo borrador' })
  @HttpCode(HttpStatus.OK)
  cloneOrder(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
  ) {
    return this.service.cloneOrder(id, user.id);
  }

  @Post(':id/reopen')
  @Roles('admin', 'comunicacion', 'comercial')
  @ApiOperation({ summary: 'Reabrir pedido cancelado o despachado' })
  @HttpCode(HttpStatus.OK)
  reopenOrder(@Param('id', ParseIntPipe) id: number) {
    return this.service.reopenOrder(id);
  }
}
