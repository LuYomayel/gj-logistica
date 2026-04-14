import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductImagesService } from './product-images.service';
import { Product } from '../entities/product.entity';
import { Tenant } from '../entities/tenant.entity';
import { ProductImage } from '../entities/product-image.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Tenant, ProductImage])],
  controllers: [ProductsController],
  providers: [ProductsService, ProductImagesService],
  exports: [ProductsService, ProductImagesService],
})
export class ProductsModule {}
