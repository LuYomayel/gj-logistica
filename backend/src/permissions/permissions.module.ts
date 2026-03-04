import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from '../entities/permission.entity';
import { PermissionGroup } from '../entities/permission-group.entity';
import { PermissionGroupItem } from '../entities/permission-group-item.entity';
import { UserPermissionGroup } from '../entities/user-permission-group.entity';
import { UserPermission } from '../entities/user-permission.entity';
import { User } from '../entities/user.entity';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Permission,
      PermissionGroup,
      PermissionGroupItem,
      UserPermissionGroup,
      UserPermission,
      User,
    ]),
  ],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
