import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { ThirdParty } from './third-party.entity';

@Entity('sales_representatives')
export class SalesRepresentative {
  @PrimaryColumn()
  userId: number;

  @PrimaryColumn()
  thirdPartyId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => ThirdParty, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'thirdPartyId' })
  thirdParty: ThirdParty;
}
