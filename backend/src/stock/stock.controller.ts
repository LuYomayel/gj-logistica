import { Controller, Get, Post, Body, Query, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StockService } from './stock.service';
import {
  CreateStockMovementDto, FilterMovementsDto, TransferStockDto, StockAtDateDto,
} from './dto/create-stock-movement.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequiresPermission } from '../common/decorators/requires-permission.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@ApiTags('stock')
@ApiBearerAuth()
@Controller('stock')
export class StockController {
  constructor(private readonly service: StockService) {}

  @Get('movements')
  @RequiresPermission('stock.read')
  @ApiOperation({ summary: 'Listar movimientos de stock' })
  findMovements(
    @Query() filter: FilterMovementsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findMovements(filter, user.tenantId);
  }

  @Get('movements/product/:productId')
  @RequiresPermission('stock.read')
  @ApiOperation({ summary: 'Movimientos de un producto' })
  getProductMovements(@Param('productId', ParseIntPipe) productId: number) {
    return this.service.getProductMovements(productId);
  }

  @Post('movements')
  @RequiresPermission('stock.write_movements')
  @ApiOperation({ summary: 'Corrección manual de stock' })
  createMovement(
    @Body() dto: CreateStockMovementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.createManualMovement(dto, user.id, user.tenantId);
  }

  @Post('transfer')
  @RequiresPermission('stock.write_movements')
  @ApiOperation({ summary: 'Transferir stock entre almacenes' })
  transfer(
    @Body() dto: TransferStockDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.transferStock(dto, user.id, user.tenantId);
  }

  @Get('at-date')
  @RequiresPermission('stock.read')
  @ApiOperation({ summary: 'Stock histórico a una fecha determinada' })
  stockAtDate(@Query() dto: StockAtDateDto) {
    return this.service.getStockAtDate(dto);
  }
}
