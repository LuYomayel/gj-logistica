import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Warehouse } from './warehouse.entity';
import { Product } from './product.entity';
import { User } from './user.entity';

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  warehouseId: number;

  @Column()
  productId: number;

  @Column({ type: 'float' }) // positive=in, negative=out
  quantity: number;

  @Column({ type: 'int', default: 0 }) // 0=manual,1=order,2=invoice,3=inventory
  movementType: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  label: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  inventoryCode: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  batchNumber: string | null;

  @Column({ type: 'decimal', precision: 24, scale: 8, nullable: true })
  price: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  originType: string | null; // 'order', 'inventory'

  @Column({ type: 'int', nullable: true })
  originId: number | null;

  @Column({ type: 'int', nullable: true })
  createdByUserId: number | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  movedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'int', default: 1 })
  entity: number;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouseId' })
  warehouse: Warehouse;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdByUserId' })
  createdBy: User | null;
}
