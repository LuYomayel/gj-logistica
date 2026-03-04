import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserTypeToUsers1741000002000 implements MigrationInterface {
  name = 'AddUserTypeToUsers1741000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
      ADD COLUMN \`userType\` ENUM('super_admin','client_admin','client_user')
        NOT NULL DEFAULT 'client_user'
        AFTER \`isAdmin\`
    `);

    // Migrate existing data:
    // isAdmin=true  → super_admin
    // isAdmin=false → client_admin (existing users managed their own data)
    await queryRunner.query(`
      UPDATE \`users\` SET \`userType\` = 'super_admin' WHERE \`isAdmin\` = 1
    `);
    await queryRunner.query(`
      UPDATE \`users\` SET \`userType\` = 'client_admin'
      WHERE \`isAdmin\` = 0 AND \`userType\` = 'client_user'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\` DROP COLUMN \`userType\`
    `);
  }
}
