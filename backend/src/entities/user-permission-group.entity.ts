import {
  Entity, PrimaryColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { PermissionGroup } from './permission-group.entity';

@Entity('user_permission_groups')
export class UserPermissionGroup {
  @PrimaryColumn()
  userId: number;

  @PrimaryColumn()
  groupId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => PermissionGroup, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: PermissionGroup;
}
