import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePermissionGroupsTables1741000004000 implements MigrationInterface {
  name = 'CreatePermissionGroupsTables1741000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── permission_groups ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE \`permission_groups\` (
        \`id\`          INT NOT NULL AUTO_INCREMENT,
        \`tenantId\`    INT NULL,
        \`name\`        VARCHAR(100) NOT NULL,
        \`description\` TEXT NULL,
        \`isActive\`    TINYINT NOT NULL DEFAULT 1,
        \`createdAt\`   DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\`   DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_pg_tenant\` FOREIGN KEY (\`tenantId\`)
          REFERENCES \`tenants\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    // ── permission_group_items ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE \`permission_group_items\` (
        \`id\`           INT NOT NULL AUTO_INCREMENT,
        \`groupId\`      INT NOT NULL,
        \`permissionId\` INT NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_group_perm\` (\`groupId\`, \`permissionId\`),
        CONSTRAINT \`fk_pgi_group\` FOREIGN KEY (\`groupId\`)
          REFERENCES \`permission_groups\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_pgi_perm\` FOREIGN KEY (\`permissionId\`)
          REFERENCES \`permissions\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`permission_group_items\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`permission_groups\``);
  }
}
