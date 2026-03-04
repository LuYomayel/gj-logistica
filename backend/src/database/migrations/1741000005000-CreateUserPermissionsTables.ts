import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserPermissionsTables1741000005000 implements MigrationInterface {
  name = 'CreateUserPermissionsTables1741000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── user_permission_groups ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE \`user_permission_groups\` (
        \`userId\`  INT NOT NULL,
        \`groupId\` INT NOT NULL,
        PRIMARY KEY (\`userId\`, \`groupId\`),
        CONSTRAINT \`fk_upg_user\` FOREIGN KEY (\`userId\`)
          REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_upg_group\` FOREIGN KEY (\`groupId\`)
          REFERENCES \`permission_groups\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    // ── user_permissions (direct overrides) ──────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE \`user_permissions\` (
        \`id\`           INT NOT NULL AUTO_INCREMENT,
        \`userId\`       INT NOT NULL,
        \`permissionId\` INT NOT NULL,
        \`granted\`      TINYINT NOT NULL DEFAULT 1,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_user_perm\` (\`userId\`, \`permissionId\`),
        CONSTRAINT \`fk_up_user\` FOREIGN KEY (\`userId\`)
          REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_up_perm\` FOREIGN KEY (\`permissionId\`)
          REFERENCES \`permissions\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`user_permissions\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`user_permission_groups\``);
  }
}
