import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { ThirdParty } from './third-party.entity';

@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  thirdPartyId: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phonePro: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneMobile: string | null;

  @Column({ type: 'varchar', length: 25, nullable: true })
  postalCode: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  alias: string | null;

  @Column({ type: 'int', default: 1 }) // 1=active
  status: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'int', default: 1 })
  entity: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Extra fields (from llx_socpeople_extrafields)
  @Column({ type: 'varchar', length: 255, nullable: true })
  marca: string | null;

  @Column({ type: 'int', unique: true, nullable: true })
  dni: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  lugarDeEntrega: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nombreFantasia: string | null;

  @ManyToOne(() => ThirdParty, { nullable: true })
  @JoinColumn({ name: 'thirdPartyId' })
  thirdParty: ThirdParty | null;
}
