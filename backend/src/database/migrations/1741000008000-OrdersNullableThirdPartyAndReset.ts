import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Con multi-tenancy, el "dueño" de un pedido es el tenant del usuario que lo crea.
 * thirdPartyId pasa a ser opcional/legacy. Además, no hay pedidos reales en prod
 * todavía, así que vaciamos las tablas de pedidos para arrancar limpio.
 */
export class OrdersNullableThirdPartyAndReset1741000008000 implements MigrationInterface {
  name = 'OrdersNullableThirdPartyAndReset1741000008000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Vaciar tablas relacionadas (sin tocar FKs)
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
    await queryRunner.query('TRUNCATE TABLE `order_contacts`');
    await queryRunner.query('TRUNCATE TABLE `order_lines`');
    await queryRunner.query('TRUNCATE TABLE `orders`');
    await queryRunner.query('TRUNCATE TABLE `order_sequences`');
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');

    // thirdPartyId → nullable
    await queryRunner.query('ALTER TABLE `orders` MODIFY `thirdPartyId` INT NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: volvemos thirdPartyId a NOT NULL. Requiere tabla vacía.
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
    await queryRunner.query('TRUNCATE TABLE `order_contacts`');
    await queryRunner.query('TRUNCATE TABLE `order_lines`');
    await queryRunner.query('TRUNCATE TABLE `orders`');
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
    await queryRunner.query('ALTER TABLE `orders` MODIFY `thirdPartyId` INT NOT NULL');
  }
}
