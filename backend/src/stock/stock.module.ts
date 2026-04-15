import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { StockMovement } from '../entities/stock-movement.entity';
import { ProductStock } from '../entities/product-stock.entity';
import { Product } from '../entities/product.entity';
import { Warehouse } from '../entities/warehouse.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StockMovement, ProductStock, Product, Warehouse])],
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
