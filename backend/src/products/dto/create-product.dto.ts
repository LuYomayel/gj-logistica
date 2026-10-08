import {
  IsString, IsOptional, IsInt, IsNumber, IsBoolean,
  MaxLength, IsDecimal, Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiPropertyOptional({
    example: 'BI000032',
    description: 'Referencia. Opcional si autoRef=true (se genera como PREFIX-N por organización).',
  })
  @IsString({ message: 'La referencia debe ser texto' })
  @IsOptional()
  @MaxLength(128, { message: 'La referencia no puede superar los 128 caracteres' })
  ref?: string;

  @ApiPropertyOptional({
    description: 'Si es true, el backend genera el ref automáticamente (PREFIX-N) e ignora el ref enviado.',
  })
  @IsBoolean()
  @IsOptional()
  autoRef?: boolean;

  @ApiPropertyOptional()
  @IsString({ message: 'El nombre debe ser texto' })
  @IsOptional()
  label?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'El código de barras debe ser texto' })
  @IsOptional()
  barcode?: string;

  @ApiPropertyOptional({ type: Number })
  @IsNumber({}, { message: 'El precio debe ser un número' })
  @IsOptional()
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional({ type: Number })
  @IsNumber({}, { message: 'El precio con IVA debe ser un número' })
  @IsOptional()
  @Type(() => Number)
  priceTTC?: number;

  @ApiPropertyOptional({ type: Number })
  @IsNumber({}, { message: 'La tasa de IVA debe ser un número' })
  @IsOptional()
  @Type(() => Number)
  vatRate?: number;

  @ApiPropertyOptional({ type: Number })
  @IsNumber({}, { message: 'El umbral de alerta de stock debe ser un número' })
  @IsOptional()
  @Type(() => Number)
  stockAlertThreshold?: number;

  @ApiPropertyOptional({ type: Number })
  @IsNumber({}, { message: 'El stock deseado debe ser un número' })
  @IsOptional()
  @Type(() => Number)
  desiredStock?: number;

  // Extra fields
  @ApiPropertyOptional() @IsString() @IsOptional() talle?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() rubro?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() subrubro?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() marca?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() color?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() posicion?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() nivelEconomico?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() imagen?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() descripcionCorta?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() keywords?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() eanInterno?: string;

  @ApiPropertyOptional({ description: 'Organización (solo super_admin la puede setear)' })
  @IsInt() @Min(1) @IsOptional() @Type(() => Number)
  tenantId?: number;
}
