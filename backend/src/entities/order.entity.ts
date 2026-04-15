import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { ThirdParty } from './third-party.entity';
import { Warehouse } from './warehouse.entity';
import { User } from './user.entity';
import { Tenant } from './tenant.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 30, unique: true })
  ref: string; // SOyymm-nnnn

  @Column({ type: 'varchar', length: 255, nullable: true })
  clientRef: string | null;

  @Column({ type: 'int', nullable: true })
  thirdPartyId: number | null;

  @Column({ type: 'int', nullable: true })
  warehouseId: number | null;

  @Column({ type: 'int', nullable: true })
  createdByUserId: number | null;

  @Column({ type: 'int', nullable: true })
  validatedByUserId: number | null;

  @Column({ type: 'timestamp', nullable: true })
  orderDate: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  deliveryDate: Date | null;

  // 0=draft, 1=validated, 2=in_progress, 3=delivered, -1=cancelled
  @Column({ type: 'int', default: 0 })
  status: number;

  @Column({ type: 'decimal', precision: 24, scale: 8, nullable: true })
  totalHT: string | null;

  @Column({ type: 'decimal', precision: 24, scale: 8, nullable: true })
  totalTax: string | null;

  @Column({ type: 'decimal', precision: 24, scale: 8, nullable: true })
  totalTTC: string | null;

  @Column({ type: 'text', nullable: true })
  publicNote: string | null;

  @Column({ type: 'text', nullable: true })
  privateNote: string | null;

  @Column({ type: 'int', nullable: true })
  source: number | null;

  @Column({ type: 'int', nullable: true })
  paymentConditionId: number | null;

  @Column({ type: 'int', nullable: true })
  paymentMethodId: number | null;

  @Column({ type: 'boolean', default: true })
  isDraft: boolean;

  @Column({ type: 'boolean', default: false })
  isBilled: boolean;

  @Column({ type: 'timestamp', nullable: true })
  validatedAt: Date | null;

  @Column({ type: 'varchar', length: 14, nullable: true })
  importKey: string | null;

  @Column({ type: 'int', default: 1 })
  entity: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Extra fields (from llx_commande_extrafields)
  @Column({ type: 'varchar', length: 255, nullable: true })
  nroSeguimiento: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  agencia: string | null;

  @ManyToOne(() => ThirdParty, { nullable: true })
  @JoinColumn({ name: 'thirdPartyId' })
  thirdParty: ThirdParty | null;

  @ManyToOne(() => Warehouse, { nullable: true })
  @JoinColumn({ name: 'warehouseId' })
  warehouse: Warehouse | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdByUserId' })
  createdBy: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'validatedByUserId' })
  validatedBy: User | null;

  @ManyToOne(() => Tenant, { nullable: true })
  @JoinColumn({ name: 'entity' })
  tenant: Tenant | null;

  @OneToMany('OrderLine', 'order', { cascade: true })
  lines: unknown[];

  @OneToMany('OrderContact', 'order')
  contacts: unknown[];
}
