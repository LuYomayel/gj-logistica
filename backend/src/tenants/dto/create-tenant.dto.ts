import { IsNotEmpty, IsString, MaxLength, IsOptional, IsBoolean, Matches } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  // El prefijo de los refs autogenerados sale de acá (ver buildRefPrefix): sin letras
  // ni números queda vacío y la autonumeración de productos deja de funcionar.
  @Matches(/[A-Za-z0-9]/, { message: 'El código debe tener al menos una letra o un número' })
  code: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
