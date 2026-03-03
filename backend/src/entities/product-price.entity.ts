import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('product_prices')
export class ProductPrice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productId: number;

  @Column({ type: 'decimal', precision: 24, scale: 8 })
  price: string;

  @Column({ type: 'decimal', precision: 24, scale: 8 })
  priceTTC: string;

  @Column({ type: 'decimal', precision: 6, scale: 3 })
  vatRate: string;

  @Column({ type: 'varchar', length: 3, default: 'HT' })
  priceBaseType: string;

  @Column({ type: 'int', nullable: true })
  createdByUserId: number | null;

  @Column({ type: 'int', default: 1 })
  entity: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;
}
