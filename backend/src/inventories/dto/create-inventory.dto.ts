import {
  IsString, IsOptional, IsInt, IsNotEmpty, IsDateString, IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateInventoryDto {
  @ApiProperty({ description: 'Referencia del inventario (ej: INV2026-001)' })
  @IsString({ message: 'La referencia debe ser texto' })
  @IsNotEmpty({ message: 'La referencia del inventario es obligatoria' })
  ref: string;

  @ApiPropertyOptional()
  @IsString({ message: 'El nombre debe ser texto' })
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({ description: 'ID del almacén (null = todos)' })
  @IsInt({ message: 'El ID del almacén debe ser un entero' })
  @IsOptional()
  @Type(() => Number)
  warehouseId?: number;

  @ApiPropertyOptional({ description: 'Filtrar solo este producto' })
  @IsInt({ message: 'El ID del producto debe ser un entero' })
  @IsOptional()
  @Type(() => Number)
  productId?: number;

  @ApiPropertyOptional()
  @IsDateString({}, { message: 'La fecha debe tener formato válido (YYYY-MM-DD)' })
  @IsOptional()
  inventoryDate?: string;
}

export class AddInventoryLineDto {
  @ApiProperty()
  @IsInt({ message: 'El ID del almacén debe ser un entero' })
  @Type(() => Number)
  warehouseId: number;

  @ApiProperty()
  @IsInt({ message: 'El ID del producto debe ser un entero' })
  @Type(() => Number)
  productId: number;

  @ApiProperty({ description: 'Cantidad contada físicamente' })
  @IsNumber({}, { message: 'La cantidad real debe ser un número' })
  @Type(() => Number)
  realQuantity: number;
}

export class UpdateInventoryLineDto {
  @ApiProperty({ description: 'Cantidad contada físicamente' })
  @IsNumber({}, { message: 'La cantidad real debe ser un número' })
  @Type(() => Number)
  realQuantity: number;
}

export class FilterInventoryDto {
  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  warehouseId?: number;

  @ApiPropertyOptional({ description: '0=borrador, 1=validado' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  status?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
