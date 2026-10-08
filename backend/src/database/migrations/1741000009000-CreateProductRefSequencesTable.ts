import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductRefSequencesTable1741000009000 implements MigrationInterface {
  name = 'CreateProductRefSequencesTable1741000009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`product_ref_sequences\` (
        \`entity\`     INT NOT NULL,
        \`currentSeq\` INT NOT NULL DEFAULT 0,
        PRIMARY KEY (\`entity\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`product_ref_sequences\``);
  }
}
