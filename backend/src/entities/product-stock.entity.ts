import {
  Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn,
  ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { Warehouse } from './warehouse.entity';
import { Product } from './product.entity';

@Entity('product_stocks')
@Unique(['warehouseId', 'productId'])
export class ProductStock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  warehouseId: number;

  @Column()
  productId: number;

  @Column({ type: 'float', default: 0 })
  quantity: number;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Warehouse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouseId' })
  warehouse: Warehouse;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;
}
