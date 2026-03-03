import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { Warehouse } from './warehouse.entity';

@Entity('inventories')
export class Inventory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64 })
  ref: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  label: string | null;

  @Column({ type: 'int', nullable: true })
  warehouseId: number | null;

  /** Filtro opcional: solo incluir este producto en el inventario */
  @Column({ type: 'int', nullable: true })
  productId: number | null;

  @Column({ type: 'timestamp', nullable: true })
  inventoryDate: Date | null;

  @Column({ type: 'int', default: 0 }) // 0=borrador, 1=validado
  status: number;

  @Column({ type: 'int', nullable: true })
  createdByUserId: number | null;

  @Column({ type: 'int', default: 1 })
  entity: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Warehouse, { nullable: true })
  @JoinColumn({ name: 'warehouseId' })
  warehouse: Warehouse | null;

  @OneToMany('InventoryLine', 'inventory', { cascade: true })
  lines: unknown[];
}
