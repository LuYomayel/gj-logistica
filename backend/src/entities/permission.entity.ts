import {
  Entity, PrimaryGeneratedColumn, Column,
} from 'typeorm';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  /** Module group: 'users', 'orders', 'products', 'stock', 'contacts', etc. */
  @Column({ type: 'varchar', length: 50 })
  module: string;

  /** Action within module: 'read', 'write', 'validate', 'delete', 'export', etc. */
  @Column({ type: 'varchar', length: 50 })
  action: string;

  /** Human-readable label shown in admin UI */
  @Column({ type: 'varchar', length: 200 })
  label: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Only shown in UI when "advanced mode" is enabled */
  @Column({ type: 'boolean', default: false })
  isAdvanced: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
