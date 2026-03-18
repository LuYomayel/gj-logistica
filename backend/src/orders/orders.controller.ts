import {
  Controller, Get, Post, Patch, Delete, Body, Query,
  Param, ParseIntPipe, HttpCode, HttpStatus, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, AddOrderLineDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { AssignOrderContactDto } from './dto/assign-order-contact.dto';
import { FilterOrderDto, OrderStatsDto } from './dto/filter-order.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequiresPermission } from '../common/decorators/requires-permission.decorator';
import { PdfService } from '../notifications/pdf.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly service: OrdersService,
    private readonly pdfService: PdfService,
  ) {}

  @Get()
  @RequiresPermission('orders.read')
  @ApiOperation({ summary: 'Listar pedidos (paginado, filtros)' })
  findAll(
    @Query() filter: FilterOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findAll(filter, user.tenantId);
  }

  @Get('stats')
  @RequiresPermission('orders.read')
  @ApiOperation({ summary: 'Estadísticas de pedidos: por mes/año y por estado' })
  getStats(
    @Query() filter: OrderStatsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getStats(filter, user.tenantId);
  }

  @Get('export')
  @RequiresPermission('orders.export')
  @ApiOperation({ summary: 'Exportar pedidos como CSV (con líneas)' })
  async exportCsv(
    @Query() filter: FilterOrderDto,
    @Res() res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const csv = await this.service.exportCsv(filter, user.tenantId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="pedidos.csv"');
    res.send('\uFEFF' + csv); // BOM prefix for Excel UTF-8 compatibility
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Descargar PDF del pedido (disponible desde status=1)' })
  async downloadPdf(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const order = await this.service.findOne(id, user.tenantId);
    const buffer = await this.pdfService.generateOrderPdf(order);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${order.ref}.pdf"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @Get(':id')
  @RequiresPermission('orders.read')
  @ApiOperation({ summary: 'Obtener pedido por ID con líneas' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findOne(id, user.tenantId);
  }

  @Post()
  @RequiresPermission('orders.write')
  @ApiOperation({ summary: 'Crear pedido en borrador' })
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user.id, user.tenantId);
  }

  @Patch(':id')
  @RequiresPermission('orders.write')
  @ApiOperation({ summary: 'Editar pedido borrador' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.service.update(id, dto);
  }

  @Post(':id/lines')
  @RequiresPermission('orders.write')
  @ApiOperation({ summary: 'Agregar línea a pedido borrador' })
  addLine(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddOrderLineDto,
  ) {
    return this.service.addLine(id, dto);
  }

  @Patch(':id/lines/:lineId/remove')
  @RequiresPermission('orders.write')
  @ApiOperation({ summary: 'Eliminar línea de pedido borrador' })
  removeLine(
    @Param('id', ParseIntPipe) id: number,
    @Param('lineId', ParseIntPipe) lineId: number,
  ) {
    return this.service.removeLine(id, lineId);
  }

  @Post(':id/validate')
  @RequiresPermission('orders.validate')
  @ApiOperation({ summary: 'Validar pedido (descuenta stock, genera ref SOyymm-nnnn)' })
  @HttpCode(HttpStatus.OK)
  validateOrder(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.validateOrder(id, user.id);
  }

  @Post(':id/cancel')
  @RequiresPermission('orders.cancel')
  @ApiOperation({ summary: 'Cancelar pedido (revierte stock si estaba validado)' })
  @HttpCode(HttpStatus.OK)
  cancelOrder(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.cancelOrder(id, user.id);
  }

  @Post(':id/progress')
  @RequiresPermission('orders.write')
  @ApiOperation({ summary: 'Pasar pedido a EN PROCESO (status=2)' })
  @HttpCode(HttpStatus.OK)
  progressOrder(@Param('id', ParseIntPipe) id: number) {
    return this.service.progressOrder(id);
  }

  @Post(':id/ship')
  @RequiresPermission('orders.close')
  @ApiOperation({ summary: 'Marcar pedido como DESPACHADO (status=3)' })
  @HttpCode(HttpStatus.OK)
  shipOrder(@Param('id', ParseIntPipe) id: number) {
    return this.service.shipOrder(id);
  }

  @Post(':id/clone')
  @RequiresPermission('orders.write')
  @ApiOperation({ summary: 'Clonar pedido como nuevo borrador' })
  @HttpCode(HttpStatus.OK)
  cloneOrder(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.cloneOrder(id, user.id, user.tenantId);
  }

  @Post(':id/reopen')
  @RequiresPermission('orders.write')
  @ApiOperation({ summary: 'Reabrir pedido cancelado o despachado' })
  @HttpCode(HttpStatus.OK)
  reopenOrder(@Param('id', ParseIntPipe) id: number) {
    return this.service.reopenOrder(id);
  }

  // ── Order Contacts ────────────────────────────────────────

  @Get(':id/contacts')
  @RequiresPermission('orders.read')
  @ApiOperation({ summary: 'Listar contactos asignados al pedido' })
  getContacts(@Param('id', ParseIntPipe) id: number) {
    return this.service.getOrderContacts(id);
  }

  @Post(':id/contacts')
  @RequiresPermission('orders.write')
  @ApiOperation({ summary: 'Asignar contacto al pedido' })
  assignContact(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignOrderContactDto,
  ) {
    return this.service.assignContact(id, dto.contactId, dto.role);
  }

  @Delete(':id/contacts/:contactId')
  @RequiresPermission('orders.write')
  @ApiOperation({ summary: 'Quitar contacto del pedido' })
  @HttpCode(HttpStatus.NO_CONTENT)
  removeContact(
    @Param('id', ParseIntPipe) id: number,
    @Param('contactId', ParseIntPipe) contactId: number,
  ) {
    return this.service.removeContact(id, contactId);
  }
}
