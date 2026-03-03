/**
 * Migrator: llx_product_price → product_prices
 * Historical price records per product.
 * Note: llx_product_price has no datec — uses date_price instead.
 */
import { srcQuery, upsertBatch, resetAutoIncrement } from '../db';
import { ETL_CONFIG } from '../etl.config';
import { log } from '../logger';

interface DolibarrProductPrice {
  rowid: number;
  fk_product: number;
  price: string | null;
  price_ttc: string | null;
  tva_tx: string | null;
  price_base_type: string | null;
  date_price: Date | null;   // actual column name (no datec in this version)
  tms: Date | null;
  fk_user_author: number | null;
  entity: number;
}

export async function migrateProductPrices(): Promise<void> {
  log('product-prices', 'Fetching from llx_product_price...');

  const rows = await srcQuery<DolibarrProductPrice>(
    `SELECT pp.rowid, pp.fk_product, pp.price, pp.price_ttc, pp.tva_tx,
            pp.price_base_type, pp.date_price, pp.tms, pp.fk_user_author, pp.entity
     FROM llx_product_price pp
     WHERE pp.entity = ?
       AND pp.fk_product IN (SELECT rowid FROM llx_product WHERE entity = ?)
     ORDER BY pp.rowid`,
    [ETL_CONFIG.entity, ETL_CONFIG.entity],
  );

  log('product-prices', `Found ${rows.length} price records`);
  if (!rows.length) return;

  const mapped = rows.map((r) => ({
    id: r.rowid,
    productId: r.fk_product,
    price: r.price ?? null,
    priceTTC: r.price_ttc ?? null,
    vatRate: r.tva_tx ?? null,
    priceBaseType: r.price_base_type ?? 'HT',
    createdAt: r.date_price ?? r.tms ?? new Date(),
    updatedAt: r.tms ?? new Date(),
    createdByUserId: r.fk_user_author ?? null,
    entity: r.entity,
  }));

  const n = await upsertBatch('product_prices', mapped);
  await resetAutoIncrement('product_prices');
  log('product-prices', `✅ Migrated ${n} price records`);
}
