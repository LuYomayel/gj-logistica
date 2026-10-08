import { Entity, PrimaryColumn, Column } from 'typeorm';

// Secuencia para la generación segura/concurrente del `ref` de productos por
// organización (PREFIX-N). Una fila por tenant (columna `entity`).
@Entity('product_ref_sequences')
export class ProductRefSequence {
  @PrimaryColumn({ type: 'int' })
  entity: number;

  @Column({ type: 'int', default: 0 })
  currentSeq: number;
}
