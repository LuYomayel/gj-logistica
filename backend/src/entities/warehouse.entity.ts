import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';

@Entity('warehouses')
export class Warehouse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  shortName: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 25, nullable: true })
  postalCode: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  city: string | null;

  @Column({ type: 'int', nullable: true })
  countryId: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  fax: string | null;

  @Column({ type: 'int', nullable: true })
  parentId: number | null;

  @Column({ type: 'int', default: 1 }) // 1=open, 0=closed
  status: number;

  @Column({ type: 'int', default: 1 })
  entity: number;

  @Column({ type: 'int', nullable: true })
  createdByUserId: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Extra field (from llx_entrepot_extrafields) — alarma si no hay stock
  @Column({ type: 'boolean', default: true })
  lowStock: boolean;

  @ManyToOne(() => Warehouse, (w) => w.children, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: Warehouse | null;

  @OneToMany(() => Warehouse, (w) => w.parent)
  children: Warehouse[];

  @OneToMany('ProductStock', 'warehouse')
  productStocks: unknown[];

  @OneToMany('StockMovement', 'warehouse')
  stockMovements: unknown[];

  @OneToMany('Order', 'warehouse')
  orders: unknown[];

  @OneToMany('Inventory', 'warehouse')
  inventories: unknown[];
}
