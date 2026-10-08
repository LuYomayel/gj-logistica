import 'reflect-metadata';
import { AppDataSource } from '../src/data-source';
import { Product } from '../src/entities/product.entity';

// Verificación end-to-end del orden natural de findAll contra la DB local.
async function main() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(Product);

  const qb = repo
    .createQueryBuilder('p')
    .leftJoinAndSelect('p.tenant', 'tenant')
    .andWhere('p.status = 1');

  qb.addSelect("REGEXP_REPLACE(p.ref, '-[0-9]+$', '')", 'ref_prefix')
    .addSelect("CAST(REGEXP_SUBSTR(p.ref, '[0-9]+$') AS UNSIGNED)", 'ref_num');

  qb.skip(0)
    .take(20)
    .orderBy('ref_prefix', 'ASC')
    .addOrderBy('ref_num', 'ASC')
    .addOrderBy('p.ref', 'ASC');

  console.log('--- SQL generado ---');
  console.log(qb.getSql());
  const [items, total] = await qb.getManyAndCount();
  console.log(`--- OK: ${total} total, primeros refs ---`);
  console.log(items.map((p) => p.ref).join(', '));
  await AppDataSource.destroy();
}

main().catch((e) => {
  console.error('FALLÓ:', e.message);
  process.exit(1);
});
