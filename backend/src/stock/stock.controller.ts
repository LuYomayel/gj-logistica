import { Controller, Get, Post, Body, Query, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StockService } from './stock.service';
import {
  CreateStockMovementDto, FilterMovementsDto, TransferStockDto, StockAtDateDto,
} from './dto/create-stock-movement.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('stock')
@ApiBearerAuth()
@Controller('stock')
export class StockController {
  constructor(private readonly service: StockService) {}

  @Get('movements')
  @ApiOperation({ summary: 'Listar movimientos de stock' })
  findMovements(@Query() filter: FilterMovementsDto) {
    return this.service.findMovements(filter);
  }

  @Get('movements/product/:productId')
  @ApiOperation({ summary: 'Movimientos de un producto' })
  getProductMovements(@Param('productId', ParseIntPipe) productId: number) {
    return this.service.getProductMovements(productId);
  }

  @Post('movements')
  @Roles('admin', 'comunicacion')
  @ApiOperation({ summary: 'Corrección manual de stock' })
  createMovement(
    @Body() dto: CreateStockMovementDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.service.createManualMovement(dto, user.id);
  }

  @Post('transfer')
  @Roles('admin', 'comunicacion')
  @ApiOperation({ summary: 'Transferir stock entre almacenes' })
  transfer(
    @Body() dto: TransferStockDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.service.transferStock(dto, user.id);
  }

  @Get('at-date')
  @ApiOperation({ summary: 'Stock histórico a una fecha determinada' })
  stockAtDate(@Query() dto: StockAtDateDto) {
    return this.service.getStockAtDate(dto);
  }
}
