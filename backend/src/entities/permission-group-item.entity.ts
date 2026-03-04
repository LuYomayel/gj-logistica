import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { PermissionGroup } from './permission-group.entity';
import { Permission } from './permission.entity';

@Entity('permission_group_items')
export class PermissionGroupItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  groupId: number;

  @Column({ type: 'int' })
  permissionId: number;

  @ManyToOne(() => PermissionGroup, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: PermissionGroup;

  @ManyToOne(() => Permission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permissionId' })
  permission: Permission;
}
