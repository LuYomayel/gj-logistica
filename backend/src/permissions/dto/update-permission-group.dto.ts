import { PartialType } from '@nestjs/mapped-types';
import { CreatePermissionGroupDto } from './create-permission-group.dto';

export class UpdatePermissionGroupDto extends PartialType(CreatePermissionGroupDto) {}
