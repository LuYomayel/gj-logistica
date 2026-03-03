import { Entity, PrimaryColumn, Column } from 'typeorm';

// Used for safe concurrent order ref generation (SOyymm-nnnn)
@Entity('order_sequences')
export class OrderSequence {
  @PrimaryColumn({ type: 'varchar', length: 4 }) // e.g. '2511'
  yearMonth: string;

  @Column({ type: 'int', default: 0 })
  currentSeq: number;
}
