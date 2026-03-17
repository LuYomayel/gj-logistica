import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductPositionPermission1741000006000 implements MigrationInterface {
  name = 'AddProductPositionPermission1741000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO \`permissions\` (\`module\`, \`action\`, \`label\`, \`isAdvanced\`)
       VALUES ('products', 'read_position', 'Ver ubicación/posición de productos', 1)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM \`permissions\` WHERE \`module\` = 'products' AND \`action\` = 'read_position'`,
    );
  }
}
