import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';

@Entity('third_parties')
export class ThirdParty {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 24, nullable: true })
  clientCode: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true }) // CUIT
  taxId: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 25, nullable: true })
  postalCode: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  city: string | null;

  @Column({ type: 'int', nullable: true })
  countryId: number | null;

  @Column({ type: 'int', nullable: true })
  provinceId: number | null;

  @Column({ type: 'int', default: 1 }) // 1=client, 2=prospect
  isClient: number;

  @Column({ type: 'int', default: 0 })
  isSupplier: number;

  @Column({ type: 'int', default: 1 })
  status: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'int', default: 1 })
  entity: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany('Contact', 'thirdParty')
  contacts: unknown[];

  @OneToMany('SalesRepresentative', 'thirdParty')
  salesReps: unknown[];
}
