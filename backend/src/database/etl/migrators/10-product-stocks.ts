/**
 * Migrator: llx_product_stock → product_stocks
 * 660 rows — current stock per product/warehouse.
 */
import { srcQuery, upsertBatch, resetAutoIncrement } from '../db';
import { log } from '../logger';

interface DolibarrProductStock {
  rowid: number;
  fk_entrepot: number;
  fk_product: number;
  reel: number;
  tms: Date | null;
}

export async function migrateProductStocks(): Promise<void> {
  log('product-stocks', 'Fetching from llx_product_stock...');

  const rows = await srcQuery<DolibarrProductStock>(
    `SELECT ps.rowid, ps.fk_entrepot, ps.fk_product, ps.reel, ps.tms
     FROM llx_product_stock ps
     WHERE ps.fk_entrepot IN (SELECT rowid FROM llx_entrepot WHERE entity = 1)
       AND ps.fk_product IN (SELECT rowid FROM llx_product WHERE entity = 1)
     ORDER BY ps.rowid`,
  );

  log('product-stocks', `Found ${rows.length} stock rows`);
  if (!rows.length) return;

  const mapped = rows.map((r) => ({
    id: r.rowid,
    warehouseId: r.fk_entrepot,
    productId: r.fk_product,
    quantity: r.reel ?? 0,
    updatedAt: r.tms ?? new Date(),
  }));

  const n = await upsertBatch('product_stocks', mapped);
  await resetAutoIncrement('product_stocks');
  log('product-stocks', `✅ Migrated ${n} stock entries`);
}
