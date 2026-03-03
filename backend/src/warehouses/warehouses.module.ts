import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarehousesService } from './warehouses.service';
import { WarehousesController } from './warehouses.controller';
import { Warehouse } from '../entities/warehouse.entity';
import { ProductStock } from '../entities/product-stock.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Warehouse, ProductStock])],
  controllers: [WarehousesController],
  providers: [WarehousesService],
  exports: [WarehousesService],
})
export class WarehousesModule {}
