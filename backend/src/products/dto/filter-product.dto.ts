import { IsOptional, IsString, IsInt, Min, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class ProductStatsDto {
  @ApiPropertyOptional({ description: 'Año (ej: 2025)' })
  @IsInt() @IsOptional() @Type(() => Number)
  year?: number;

  @ApiPropertyOptional({ description: 'Filtrar por tercero' })
  @IsInt() @IsOptional() @Type(() => Number)
  thirdPartyId?: number;

  @ApiPropertyOptional({ description: 'Filtrar por producto específico' })
  @IsInt() @IsOptional() @Type(() => Number)
  productId?: number;
}

export class FilterProductDto {
  @ApiPropertyOptional() @IsString() @IsOptional() search?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() rubro?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() subrubro?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() marca?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() talle?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() color?: string;

  @ApiPropertyOptional({ description: 'Solo productos con stock < alerta' })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  lowStock?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 50;
}
