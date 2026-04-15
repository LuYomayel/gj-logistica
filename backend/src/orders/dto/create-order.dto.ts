import {
  IsInt, IsNumber, IsOptional, IsString,
  IsArray, ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AddOrderLineDto {
  @ApiPropertyOptional()
  @IsInt({ message: 'El ID del producto debe ser un entero' })
  @IsOptional()
  productId?: number;

  @ApiPropertyOptional()
  @IsString({ message: 'El nombre de la línea debe ser texto' })
  @IsOptional()
  label?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  @IsOptional()
  description?: string;

  @ApiProperty({ default: 1 })
  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional()
  @IsNumber({}, { message: 'El precio unitario debe ser un número' })
  @IsOptional()
  @Type(() => Number)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsNumber({}, { message: 'La tasa de IVA debe ser un número' })
  @IsOptional()
  @Type(() => Number)
  vatRate?: number;

  @ApiPropertyOptional()
  @IsNumber({}, { message: 'El descuento debe ser un número' })
  @IsOptional()
  @Type(() => Number)
  discountPercent?: number;

  @ApiPropertyOptional()
  @IsInt({ message: 'La posición debe ser un entero' })
  @IsOptional()
  @Type(() => Number)
  position?: number;
}

export class CreateOrderDto {
  @ApiPropertyOptional({ description: 'Tercero opcional (legacy). Nunca es obligatorio.' })
  @IsInt({ message: 'El ID del tercero debe ser un entero' })
  @IsOptional()
  @Type(() => Number)
  thirdPartyId?: number;

  @ApiPropertyOptional({ description: 'ID de la organización dueña del pedido. Obligatorio solo para super_admin.' })
  @IsInt({ message: 'El ID de la organización debe ser un entero' })
  @IsOptional()
  @Type(() => Number)
  tenantId?: number;

  @ApiPropertyOptional()
  @IsInt({ message: 'El ID del almacén debe ser un entero' })
  @IsOptional()
  warehouseId?: number;

  @ApiPropertyOptional()
  @IsString({ message: 'La referencia de cliente debe ser texto' })
  @IsOptional()
  clientRef?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'La nota pública debe ser texto' })
  @IsOptional()
  publicNote?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'La nota privada debe ser texto' })
  @IsOptional()
  privateNote?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  orderDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  deliveryDate?: Date;

  @ApiPropertyOptional()
  @IsInt({ message: 'El ID de condición de pago debe ser un entero' })
  @IsOptional()
  @Type(() => Number)
  paymentConditionId?: number;

  @ApiPropertyOptional()
  @IsInt({ message: 'El ID de método de pago debe ser un entero' })
  @IsOptional()
  @Type(() => Number)
  paymentMethodId?: number;

  @ApiPropertyOptional()
  @IsString({ message: 'El número de seguimiento debe ser texto' })
  @IsOptional()
  nroSeguimiento?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'La agencia debe ser texto' })
  @IsOptional()
  agencia?: string;

  @ApiPropertyOptional({ type: [AddOrderLineDto] })
  @IsArray({ message: 'Las líneas deben ser un array' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AddOrderLineDto)
  lines?: AddOrderLineDto[];
}
