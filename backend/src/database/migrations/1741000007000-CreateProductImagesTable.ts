import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductImagesTable1741000007000 implements MigrationInterface {
  name = 'CreateProductImagesTable1741000007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`product_images\` (
        \`id\`         INT NOT NULL AUTO_INCREMENT,
        \`productId\`  INT NOT NULL,
        \`filename\`   VARCHAR(255) NOT NULL,
        \`mimeType\`   VARCHAR(64) NOT NULL,
        \`sizeBytes\`  INT NOT NULL,
        \`width\`      SMALLINT NULL,
        \`height\`     SMALLINT NULL,
        \`createdAt\`  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\`  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_product_image_product\` (\`productId\`),
        CONSTRAINT \`FK_product_image_product\` FOREIGN KEY (\`productId\`)
          REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`product_images\``);
  }
}
