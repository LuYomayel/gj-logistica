/**
 * Migrator: llx_stock_mouvement → stock_movements
 * 5.791 movements — migrated in batches.
 * Note: column is type_mouvement (not type), no datec (use tms), no entity column.
 */
import { srcQuery, upsertBatch, resetAutoIncrement, getDestPool } from '../db';
import { ETL_CONFIG } from '../etl.config';
import { log } from '../logger';

interface DolibarrStockMovement {
  rowid: number;
  fk_entrepot: number;
  fk_product: number;
  value: number;
  type_mouvement: number;    // actual column name (not 'type')
  fk_user_author: number | null;
  datem: Date | null;
  tms: Date | null;          // used as createdAt fallback (no datec in this version)
  origintype: string | null;
  fk_origin: number | null;
  batch: string | null;
  label: string | null;
  inventorycode: string | null;
  price: string | null;
}

export async function migrateStockMovements(): Promise<void> {
  log('stock-movements', 'Fetching from llx_stock_mouvement...');

  const dest = getDestPool();
  const [destUsers] = await dest.execute('SELECT id FROM users');
  const validUserIds = new Set((destUsers as { id: number }[]).map((u) => u.id));

  const [{ cnt }] = await srcQuery<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM llx_stock_mouvement sm
     WHERE sm.fk_entrepot IN (SELECT rowid FROM llx_entrepot WHERE entity = ?)
       AND sm.fk_product IN (SELECT rowid FROM llx_product WHERE entity = ?)`,
    [ETL_CONFIG.entity, ETL_CONFIG.entity],
  );

  log('stock-movements', `Found ${cnt} movements — processing in batches...`);

  let offset = 0;
  let totalMigrated = 0;

  const batchSize = Number(ETL_CONFIG.batchSize);
  while (offset < cnt) {
    const limit = Math.min(batchSize, cnt - offset);
    const rows = await srcQuery<DolibarrStockMovement>(
      `SELECT sm.rowid, sm.fk_entrepot, sm.fk_product, sm.value, sm.type_mouvement,
              sm.fk_user_author, sm.datem, sm.tms, sm.origintype, sm.fk_origin,
              sm.batch, sm.label, sm.inventorycode, sm.price
       FROM llx_stock_mouvement sm
       WHERE sm.fk_entrepot IN (SELECT rowid FROM llx_entrepot WHERE entity = ?)
         AND sm.fk_product IN (SELECT rowid FROM llx_product WHERE entity = ?)
       ORDER BY sm.rowid
       LIMIT ${limit} OFFSET ${offset}`,
      [ETL_CONFIG.entity, ETL_CONFIG.entity],
    );

    if (!rows.length) break;

    const mapped = rows.map((r) => ({
      id: r.rowid,
      warehouseId: r.fk_entrepot,
      productId: r.fk_product,
      quantity: r.value ?? 0,
      movementType: r.type_mouvement ?? 0,
      createdByUserId: r.fk_user_author != null && validUserIds.has(r.fk_user_author) ? r.fk_user_author : null,
      movedAt: r.datem ?? r.tms ?? new Date(),
      originType: r.origintype ?? null,
      originId: r.fk_origin ?? null,
      batchNumber: r.batch ?? null,
      label: r.label ?? null,
      inventoryCode: r.inventorycode ?? null,
      createdAt: r.tms ?? new Date(),
      price: r.price ?? null,
      entity: ETL_CONFIG.entity,  // hardcoded — no entity column in llx_stock_mouvement
    }));

    await upsertBatch('stock_movements', mapped, ETL_CONFIG.batchSize);
    totalMigrated += mapped.length;
    offset += batchSize;
    log('stock-movements', `  → Progress: ${totalMigrated}/${cnt}`);
  }

  await resetAutoIncrement('stock_movements');
  log('stock-movements', `✅ Migrated ${totalMigrated} stock movements`);
}
