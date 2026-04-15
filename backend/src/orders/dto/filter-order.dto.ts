import { IsInt, IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class OrderStatsDto {
  @ApiPropertyOptional({ description: 'Año (ej: 2025)' })
  @IsInt() @IsOptional() @Type(() => Number)
  year?: number;

  @ApiPropertyOptional()
  @IsInt() @IsOptional() @Type(() => Number)
  thirdPartyId?: number;

  @ApiPropertyOptional({ description: '-1=cancelado,0=borrador,1=validado,2=en_proceso,3=despachado' })
  @IsInt() @IsOptional() @Type(() => Number)
  status?: number;

  @ApiPropertyOptional({ description: 'ID del usuario que creó los pedidos' })
  @IsInt() @IsOptional() @Type(() => Number)
  createdByUserId?: number;
}

export class FilterOrderDto {
  @ApiPropertyOptional({ description: '-1=cancelled,0=draft,1=validated,2=in_progress,3=delivered' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  status?: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  thirdPartyId?: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  warehouseId?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isDraft?: boolean;

  @ApiPropertyOptional({ description: 'Referencia del pedido (búsqueda parcial)' })
  @IsString()
  @IsOptional()
  ref?: string;

  @ApiPropertyOptional({ description: 'Ref. de cliente (búsqueda parcial)' })
  @IsString()
  @IsOptional()
  clientRef?: string;

  @ApiPropertyOptional({ description: 'ISO date string' })
  @IsString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'ISO date string' })
  @IsString()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 50;

  /** Solo respetado cuando el caller es super_admin; para los demás se ignora. */
  @ApiPropertyOptional({ description: 'Filtrar por organización (solo super_admin)' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  tenantId?: number;
}
