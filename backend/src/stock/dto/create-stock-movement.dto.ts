import {
  IsInt, IsNumber, IsOptional, IsString, IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateStockMovementDto {
  @ApiProperty()
  @IsInt({ message: 'El ID del almacén debe ser un entero' })
  @Type(() => Number)
  warehouseId: number;

  @ApiProperty()
  @IsInt({ message: 'El ID del producto debe ser un entero' })
  @Type(() => Number)
  productId: number;

  @ApiProperty({ description: 'Positivo=entrada, negativo=salida' })
  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional({ description: 'Descripción del movimiento' })
  @IsString({ message: 'La descripción debe ser texto' })
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({ description: 'Código de inventario/referencia manual' })
  @IsString({ message: 'El código de inventario debe ser texto' })
  @IsOptional()
  inventoryCode?: string;
}

export class TransferStockDto {
  @ApiPropertyOptional({ description: 'Almacén origen (omitir para entrada sin origen)' })
  @IsInt({ message: 'El ID del almacén origen debe ser un entero' })
  @IsOptional()
  @Type(() => Number)
  fromWarehouseId?: number;

  @ApiProperty({ description: 'Almacén destino' })
  @IsInt({ message: 'El ID del almacén destino debe ser un entero' })
  @Type(() => Number)
  toWarehouseId: number;

  @ApiProperty()
  @IsInt({ message: 'El ID del producto debe ser un entero' })
  @Type(() => Number)
  productId: number;

  @ApiProperty({ description: 'Cantidad a transferir (siempre positivo)' })
  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  @IsOptional()
  label?: string;
}

export class StockAtDateDto {
  @ApiProperty({ description: 'Fecha objetivo en formato ISO (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha debe tener formato válido (YYYY-MM-DD)' })
  date: string;

  @ApiPropertyOptional({ description: 'Filtrar por almacén' })
  @IsInt({ message: 'El ID del almacén debe ser un entero' })
  @IsOptional()
  @Type(() => Number)
  warehouseId?: number;

  @ApiPropertyOptional({ description: 'Filtrar por producto' })
  @IsInt({ message: 'El ID del producto debe ser un entero' })
  @IsOptional()
  @Type(() => Number)
  productId?: number;
}

export class FilterMovementsDto {
  @ApiPropertyOptional() @IsInt() @IsOptional() @Type(() => Number) warehouseId?: number;
  @ApiPropertyOptional() @IsInt() @IsOptional() @Type(() => Number) productId?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() originType?: string;
  @ApiPropertyOptional({ default: 1 }) @IsInt() @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional({ default: 50 }) @IsInt() @IsOptional() @Type(() => Number) limit?: number = 50;
}
