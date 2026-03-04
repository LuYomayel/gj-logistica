import { IsInt, IsPositive, IsBoolean } from 'class-validator';

export class SetUserPermissionDto {
  @IsInt()
  @IsPositive()
  permissionId: number;

  @IsBoolean()
  granted: boolean;
}
