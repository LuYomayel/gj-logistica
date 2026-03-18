import { IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignOrderContactDto {
  @ApiProperty()
  @IsInt()
  contactId: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  role?: string;
}
