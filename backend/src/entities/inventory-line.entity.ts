import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Inventory } from './inventory.entity';

@Entity('inventory_lines')
export class InventoryLine {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  inventoryId: number;

  @Column({ type: 'int', nullable: true })
  warehouseId: number | null;

  @Column({ type: 'int', nullable: true })
  productId: number | null;

  /** Cantidad esperada según el sistema (stock actual al momento del inventario) */
  @Column({ type: 'float', nullable: true })
  expectedQuantity: number | null;

  /** Cantidad contada físicamente */
  @Column({ type: 'float', nullable: true })
  realQuantity: number | null;

  @Column({ type: 'int', nullable: true })
  createdByUserId: number | null;

  @Column({ type: 'int', default: 1 })
  entity: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Inventory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inventoryId' })
  inventory: Inventory;
}
