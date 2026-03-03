import {
  IsString, IsEmail, IsOptional, IsNotEmpty,
  IsInt, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateThirdPartyDto {
  @ApiProperty({ example: 'Corteva Argentina' })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(200, { message: 'El nombre no puede superar los 200 caracteres' })
  name: string;

  @ApiPropertyOptional()
  @IsString({ message: 'El código de cliente debe ser texto' })
  @IsOptional()
  clientCode?: string;

  @ApiPropertyOptional({ description: 'CUIT' })
  @IsString({ message: 'El CUIT debe ser texto' })
  @IsOptional()
  taxId?: string;

  @ApiPropertyOptional()
  @IsEmail({}, { message: 'El email no es válido' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'El teléfono debe ser texto' })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'La dirección debe ser texto' })
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'El código postal debe ser texto' })
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'La ciudad debe ser texto' })
  @IsOptional()
  city?: string;

  @ApiPropertyOptional()
  @IsInt({ message: 'El ID del país debe ser un entero' })
  @IsOptional()
  countryId?: number;

  @ApiPropertyOptional()
  @IsInt({ message: 'El ID de la provincia debe ser un entero' })
  @IsOptional()
  provinceId?: number;

  @ApiPropertyOptional()
  @IsString({ message: 'El sitio web debe ser texto' })
  @IsOptional()
  website?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'Las notas deben ser texto' })
  @IsOptional()
  notes?: string;
}
