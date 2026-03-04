import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiHideProperty } from '@nestjs/swagger';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  username: string;

  @Exclude()
  @ApiHideProperty()
  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastName: string | null;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'boolean', default: false })
  isAdmin: boolean;

  /**
   * User type for multi-tenancy:
   * - super_admin: global access, bypass all permission checks (isAdmin=true)
   * - client_admin: tenant admin, manages users/groups within their tenant
   * - client_user: regular tenant user, permissions via permission groups
   * Stored in `entity` column = tenantId (null not possible in int; super_admin uses entity=0)
   */
  @Column({
    type: 'enum',
    enum: ['super_admin', 'client_admin', 'client_user'],
    default: 'client_user',
  })
  userType: 'super_admin' | 'client_admin' | 'client_user';

  @Column({ type: 'int', default: 1 }) // 1=active, 0=inactive
  status: number;

  @Column({ type: 'varchar', length: 6, default: 'es_AR', nullable: true })
  language: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'int', nullable: true })
  supervisorId: number | null;

  @Column({ type: 'int', nullable: true })
  thirdPartyId: number | null;

  @Column({ type: 'int', default: 1 })
  entity: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (u) => u.subordinates, { nullable: true })
  @JoinColumn({ name: 'supervisorId' })
  supervisor: User | null;

  @OneToMany(() => User, (u) => u.supervisor)
  subordinates: User[];

  @OneToMany('UserGroupMembership', 'user')
  groupMemberships: unknown[];
}
