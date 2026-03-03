import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from './product.entity';

@Entity('order_lines')
export class OrderLine {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  orderId: number;

  @Column({ type: 'int', nullable: true })
  productId: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  label: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'float', default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 24, scale: 8, nullable: true })
  unitPrice: string | null;

  @Column({ type: 'decimal', precision: 24, scale: 8, nullable: true })
  totalHT: string | null;

  @Column({ type: 'decimal', precision: 24, scale: 8, nullable: true })
  totalTax: string | null;

  @Column({ type: 'decimal', precision: 24, scale: 8, nullable: true })
  totalTTC: string | null;

  @Column({ type: 'decimal', precision: 6, scale: 3, nullable: true })
  vatRate: string | null;

  @Column({ type: 'float', default: 0, nullable: true })
  discountPercent: number | null;

  @Column({ type: 'decimal', precision: 24, scale: 8, nullable: true })
  discount: string | null;

  @Column({ type: 'int', default: 0, nullable: true })
  position: number | null;

  @Column({ type: 'int', nullable: true })
  unitId: number | null;

  @Column({ type: 'int', default: 0, nullable: true })
  productType: number | null;

  @Column({ type: 'decimal', precision: 24, scale: 8, nullable: true })
  buyPriceHT: string | null;

  @Column({ type: 'int', nullable: true })
  parentLineId: number | null;

  @Column({ type: 'int', default: 1 })
  entity: number;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'productId' })
  product: Product | null;
}
