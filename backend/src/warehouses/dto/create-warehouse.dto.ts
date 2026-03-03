import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateWarehouseDto {
  @ApiProperty({ example: 'Almacen general' })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre del almacén es obligatorio' })
  @MaxLength(128, { message: 'El nombre no puede superar los 128 caracteres' })
  name: string;

  @ApiPropertyOptional({ description: 'Nombre corto o ubicación resumida' })
  @IsString({ message: 'El nombre corto debe ser texto' })
  @IsOptional()
  @MaxLength(255, { message: 'El nombre corto no puede superar los 255 caracteres' })
  shortName?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Ubicación interna (pasillo, sector, etc.)' })
  @IsString({ message: 'La ubicación debe ser texto' })
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: 'Almacén padre (ID)' })
  @IsInt({ message: 'El ID del almacén padre debe ser un entero' })
  @IsOptional()
  @Type(() => Number)
  parentId?: number;

  @ApiPropertyOptional({ description: 'Dirección física del almacén' })
  @IsString({ message: 'La dirección debe ser texto' })
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'C1234ABC' })
  @IsString({ message: 'El código postal debe ser texto' })
  @IsOptional()
  @MaxLength(25, { message: 'El código postal no puede superar los 25 caracteres' })
  postalCode?: string;

  @ApiPropertyOptional({ example: 'Buenos Aires' })
  @IsString({ message: 'La ciudad debe ser texto' })
  @IsOptional()
  @MaxLength(50, { message: 'La ciudad no puede superar los 50 caracteres' })
  city?: string;

  @ApiPropertyOptional({ description: 'ID del país (FK a tabla países)' })
  @IsInt({ message: 'El ID del país debe ser un entero' })
  @IsOptional()
  @Type(() => Number)
  countryId?: number;

  @ApiPropertyOptional({ example: '+54 11 1234-5678' })
  @IsString({ message: 'El teléfono debe ser texto' })
  @IsOptional()
  @MaxLength(20, { message: 'El teléfono no puede superar los 20 caracteres' })
  phone?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'El fax debe ser texto' })
  @IsOptional()
  @MaxLength(20, { message: 'El fax no puede superar los 20 caracteres' })
  fax?: string;

  @ApiPropertyOptional({ description: 'Activar alarma si no hay stock' })
  @IsBoolean({ message: 'El campo de alerta de stock debe ser verdadero o falso' })
  @IsOptional()
  lowStock?: boolean;
}
