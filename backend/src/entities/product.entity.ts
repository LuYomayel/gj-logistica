import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Tenant } from './tenant.entity';

@Entity('products')
@Unique('UQ_product_ref_entity', ['ref', 'entity'])
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 128 })
  ref: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  label: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  barcode: string | null;

  @Column({ type: 'int', nullable: true })
  barcodeTypeId: number | null;

  @Column({ type: 'int', default: 1 })
  isBuyable: number;

  @Column({ type: 'int', default: 1 })
  isSellable: number;

  @Column({ type: 'int', default: 0 }) // 0=product, 1=service
  productType: number;

  @Column({ type: 'decimal', precision: 24, scale: 8, nullable: true })
  price: string | null;

  @Column({ type: 'decimal', precision: 24, scale: 8, nullable: true })
  priceTTC: string | null;

  @Column({ type: 'decimal', precision: 6, scale: 3, nullable: true })
  vatRate: string | null;

  @Column({ type: 'float', default: 0, nullable: true })
  stock: number | null;

  @Column({ type: 'float', default: 0, nullable: true })
  stockAlertThreshold: number | null;

  @Column({ type: 'float', default: 0, nullable: true })
  desiredStock: number | null;

  @Column({ type: 'float', nullable: true })
  weight: number | null;

  @Column({ type: 'int', nullable: true })
  weightUnits: number | null;

  @Column({ type: 'int', nullable: true })
  unitId: number | null;

  @Column({ type: 'int', default: 1 })
  status: number;

  @Column({ type: 'int', default: 1 })
  statusBuy: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'int', default: 1 })
  entity: number;

  @Column({ type: 'int', nullable: true })
  createdByUserId: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Extra fields (from llx_product_extrafields)
  @Column({ type: 'varchar', length: 255, nullable: true })
  talle: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  rubro: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subrubro: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  marca: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  color: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  posicion: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nivelEconomico: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  imagen: string | null;

  @Column({ type: 'text', nullable: true })
  descripcionCorta: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  keywords: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  eanInterno: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdByUserId' })
  createdBy: User | null;

  @ManyToOne(() => Tenant, { nullable: true })
  @JoinColumn({ name: 'entity' })
  tenant: Tenant | null;

  @OneToMany('ProductPrice', 'product')
  prices: unknown[];

  @OneToMany('ProductStock', 'product')
  stocks: unknown[];

  @OneToMany('StockMovement', 'product')
  stockMovements: unknown[];

  @OneToMany('OrderLine', 'product')
  orderLines: unknown[];
}
