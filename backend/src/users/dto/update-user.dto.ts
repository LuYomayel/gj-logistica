import { PartialType, OmitType } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['username'] as const)) {
  @ApiPropertyOptional({ enum: [0, 1] })
  @IsInt()
  @IsOptional()
  status?: number;
}
