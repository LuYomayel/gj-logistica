import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('notification_settings')
export class NotificationSetting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 }) // ORDER_VALIDATE, ORDER_CLOSE
  event: string;

  @Column({ type: 'int', nullable: true })
  userId: number | null;

  @Column({ type: 'int', nullable: true })
  contactId: number | null;

  @Column({ type: 'int', nullable: true })
  thirdPartyId: number | null;

  @Column({ type: 'varchar', length: 32, default: 'email' })
  type: string;

  // Direct recipient email (may override userId/contactId lookup)
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 1 })
  entity: number;

  @CreateDateColumn()
  createdAt: Date;
}
