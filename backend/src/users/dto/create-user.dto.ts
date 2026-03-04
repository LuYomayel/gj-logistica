import {
  IsString, IsEmail, IsOptional, IsBoolean,
  IsInt, MinLength, MaxLength, IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'jperez' })
  @IsString({ message: 'El usuario debe ser texto' })
  @MinLength(3, { message: 'El usuario debe tener al menos 3 caracteres' })
  @MaxLength(50, { message: 'El usuario no puede superar los 50 caracteres' })
  username: string;

  @ApiProperty({ example: 'Contraseña123' })
  @IsString({ message: 'La contraseña debe ser texto' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiPropertyOptional()
  @IsString({ message: 'El nombre debe ser texto' })
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'El apellido debe ser texto' })
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional()
  @IsEmail({}, { message: 'El email no es válido' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'El teléfono debe ser texto' })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsBoolean({ message: 'El campo admin debe ser verdadero o falso' })
  @IsOptional()
  isAdmin?: boolean;

  @ApiPropertyOptional({ enum: ['super_admin', 'client_admin', 'client_user'] })
  @IsIn(['super_admin', 'client_admin', 'client_user'])
  @IsOptional()
  userType?: 'super_admin' | 'client_admin' | 'client_user';

  @ApiPropertyOptional({ description: 'Tenant ID (columna entity)' })
  @IsInt()
  @IsOptional()
  entity?: number;

  @ApiPropertyOptional()
  @IsInt({ message: 'El ID del supervisor debe ser un entero' })
  @IsOptional()
  supervisorId?: number;
}
