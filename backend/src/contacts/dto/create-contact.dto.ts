import {
  IsString, IsEmail, IsOptional, IsInt, IsNotEmpty,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiPropertyOptional({ description: 'ID de la organización dueña del contacto. Obligatorio solo para super_admin.' })
  @IsInt({ message: 'El ID de la organización debe ser un entero' })
  @IsOptional()
  tenantId?: number;

  @ApiPropertyOptional()
  @IsInt({ message: 'El ID del tercero debe ser un entero' })
  @IsOptional()
  thirdPartyId?: number;

  @ApiProperty({ example: 'Juan' })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  firstName: string;

  @ApiProperty({ example: 'Perez' })
  @IsString({ message: 'El apellido debe ser texto' })
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  lastName: string;

  @ApiPropertyOptional()
  @IsEmail({}, { message: 'El email no es válido' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'El teléfono laboral debe ser texto' })
  @IsOptional()
  phonePro?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'El teléfono celular debe ser texto' })
  @IsOptional()
  phoneMobile?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'La dirección debe ser texto' })
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'La ciudad debe ser texto' })
  @IsOptional()
  city?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'El código postal debe ser texto' })
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'El alias debe ser texto' })
  @IsOptional()
  alias?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'Las notas deben ser texto' })
  @IsOptional()
  notes?: string;

  // Extra fields
  @ApiPropertyOptional({ description: 'Marca con la que trabaja el contacto' })
  @IsString({ message: 'La marca debe ser texto' })
  @IsOptional()
  marca?: string;

  @ApiPropertyOptional({ description: 'DNI (único)' })
  @IsInt({ message: 'El DNI debe ser un número entero' })
  @IsOptional()
  dni?: number;

  @ApiPropertyOptional()
  @IsString({ message: 'El lugar de entrega debe ser texto' })
  @IsOptional()
  lugarDeEntrega?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'El nombre fantasía debe ser texto' })
  @IsOptional()
  nombreFantasia?: string;
}
