import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenantsTable1741000001000 implements MigrationInterface {
  name = 'CreateTenantsTable1741000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`tenants\` (
        \`id\`        INT NOT NULL AUTO_INCREMENT,
        \`name\`      VARCHAR(200) NOT NULL,
        \`code\`      VARCHAR(30) NOT NULL UNIQUE,
        \`isActive\`  TINYINT NOT NULL DEFAULT 1,
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // Corteva is tenant #1 — all existing data has entity=1
    await queryRunner.query(`
      INSERT INTO \`tenants\` (\`id\`, \`name\`, \`code\`, \`isActive\`)
      VALUES (1, 'Corteva', 'CORTEVA', 1)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`tenants\``);
  }
}
