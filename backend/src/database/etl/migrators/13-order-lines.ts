/**
 * Migrator: llx_commandedet → order_lines
 * Lines for all migrated orders.
 * Note: llx_commandedet has no entity column — hardcode ETL_CONFIG.entity.
 */
import { srcQuery, upsertBatch, resetAutoIncrement } from '../db';
import { ETL_CONFIG } from '../etl.config';
import { log } from '../logger';

interface DolibarrOrderLine {
  rowid: number;
  fk_commande: number;
  fk_product: number | null;
  label: string | null;
  description: string | null;
  qty: number;
  subprice: string | null;
  total_ht: string | null;
  total_tva: string | null;
  total_ttc: string | null;
  tva_tx: string | null;
  remise_percent: number | null;
  remise: string | null;
  rang: number | null;
  fk_unit: number | null;
  product_type: number | null;
  buy_price_ht: string | null;
  fk_parent_line: number | null;
}

export async function migrateOrderLines(): Promise<void> {
  log('order-lines', 'Fetching from llx_commandedet...');

  const [{ cnt }] = await srcQuery<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM llx_commandedet
     WHERE fk_commande IN (SELECT rowid FROM llx_commande WHERE entity = ?)`,
    [ETL_CONFIG.entity],
  );

  log('order-lines', `Found ${cnt} order lines — processing in batches...`);

  let offset = 0;
  let totalMigrated = 0;

  const batchSize = Number(ETL_CONFIG.batchSize);
  while (offset < cnt) {
    const limit = Math.min(batchSize, cnt - offset);
    const rows = await srcQuery<DolibarrOrderLine>(
      `SELECT cd.rowid, cd.fk_commande, cd.fk_product, cd.label, cd.description,
              cd.qty, cd.subprice, cd.total_ht, cd.total_tva, cd.total_ttc,
              cd.tva_tx, cd.remise_percent, cd.remise, cd.rang, cd.fk_unit,
              cd.product_type, cd.buy_price_ht, cd.fk_parent_line
       FROM llx_commandedet cd
       WHERE cd.fk_commande IN (SELECT rowid FROM llx_commande WHERE entity = ?)
       ORDER BY cd.fk_commande, cd.rang, cd.rowid
       LIMIT ${limit} OFFSET ${offset}`,
      [ETL_CONFIG.entity],
    );

    if (!rows.length) break;

    const mapped = rows.map((r) => ({
      id: r.rowid,
      orderId: r.fk_commande,
      productId: r.fk_product ?? null,
      label: r.label ?? null,
      description: r.description ?? null,
      quantity: r.qty ?? 1,
      unitPrice: r.subprice ?? null,
      totalHT: r.total_ht ?? null,
      totalTax: r.total_tva ?? null,
      totalTTC: r.total_ttc ?? null,
      vatRate: r.tva_tx ?? null,
      discountPercent: r.remise_percent ?? null,
      discount: r.remise ?? null,
      position: r.rang ?? null,
      unitId: r.fk_unit ?? null,
      productType: r.product_type ?? null,
      buyPriceHT: r.buy_price_ht ?? null,
      parentLineId: r.fk_parent_line ?? null,
      entity: ETL_CONFIG.entity,  // hardcoded — no entity column in llx_commandedet
    }));

    await upsertBatch('order_lines', mapped, ETL_CONFIG.batchSize);
    totalMigrated += mapped.length;
    offset += batchSize;
    log('order-lines', `  → Progress: ${totalMigrated}/${cnt}`);
  }

  await resetAutoIncrement('order_lines');
  log('order-lines', `✅ Migrated ${totalMigrated} order lines`);
}
