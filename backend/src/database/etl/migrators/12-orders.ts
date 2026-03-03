/**
 * Migrator: llx_commande + llx_commande_extrafields → orders
 * 818 orders. Extra fields: nroSeguimiento, agencia.
 * Note: no brouillon column (derive isDraft from fk_statut===0), datec→date_creation.
 */
import { srcQuery, upsertBatch, resetAutoIncrement, getDestPool } from '../db';
import { ETL_CONFIG } from '../etl.config';
import { log } from '../logger';

interface DolibarrOrder {
  rowid: number;
  ref: string;
  ref_client: string | null;
  fk_soc: number;
  fk_user_author: number | null;
  fk_user_valid: number | null;
  date_commande: Date | null;
  date_livraison: Date | null;
  fk_statut: number;
  total_ht: string | null;
  total_tva: string | null;
  total_ttc: string | null;
  note_public: string | null;
  note_private: string | null;
  fk_warehouse: number | null;
  source: number | null;
  fk_cond_reglement: number | null;
  fk_mode_reglement: number | null;
  facture: number;
  date_valid: Date | null;
  date_creation: Date | null;  // actual column (no 'datec' in llx_commande)
  tms: Date | null;
  entity: number;
  import_key: string | null;
  // extra fields
  nrodeseguimiento: string | null;
  agencia: string | null;
}

export async function migrateOrders(): Promise<void> {
  log('orders', 'Fetching from llx_commande + llx_commande_extrafields...');

  const dest = getDestPool();
  const [destUsers] = await dest.execute('SELECT id FROM users');
  const validUserIds = new Set((destUsers as { id: number }[]).map((u) => u.id));
  const [destWarehouses] = await dest.execute('SELECT id FROM warehouses');
  const validWarehouseIds = new Set((destWarehouses as { id: number }[]).map((w) => w.id));

  const [{ cnt }] = await srcQuery<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM llx_commande WHERE entity = ?`,
    [ETL_CONFIG.entity],
  );

  log('orders', `Found ${cnt} orders — processing in batches...`);

  let offset = 0;
  let totalMigrated = 0;

  const batchSize = Number(ETL_CONFIG.batchSize);
  while (offset < cnt) {
    const limit = Math.min(batchSize, cnt - offset);
    const rows = await srcQuery<DolibarrOrder>(
      `SELECT
         c.rowid, c.ref, c.ref_client, c.fk_soc, c.fk_user_author, c.fk_user_valid,
         c.date_commande, c.date_livraison, c.fk_statut, c.total_ht, c.total_tva, c.total_ttc,
         c.note_public, c.note_private, c.fk_warehouse, c.source,
         c.fk_cond_reglement, c.fk_mode_reglement,
         c.facture, c.date_valid, c.date_creation, c.tms, c.entity, c.import_key,
         ce.nrodeseguimiento, ce.agencia
       FROM llx_commande c
       LEFT JOIN llx_commande_extrafields ce ON ce.fk_object = c.rowid
       WHERE c.entity = ?
       ORDER BY c.rowid
       LIMIT ${limit} OFFSET ${offset}`,
      [ETL_CONFIG.entity],
    );

    if (!rows.length) break;

    const mapped = rows.map((r) => ({
      id: r.rowid,
      ref: r.ref ?? `MIGRATED-${r.rowid}`,
      clientRef: r.ref_client ?? null,
      thirdPartyId: r.fk_soc,
      createdByUserId: r.fk_user_author != null && r.fk_user_author !== 0 && validUserIds.has(r.fk_user_author) ? r.fk_user_author : null,
      validatedByUserId: r.fk_user_valid != null && r.fk_user_valid !== 0 && validUserIds.has(r.fk_user_valid) ? r.fk_user_valid : null,
      orderDate: r.date_commande ?? null,
      deliveryDate: r.date_livraison ?? null,
      status: r.fk_statut ?? 0,
      totalHT: r.total_ht ?? null,
      totalTax: r.total_tva ?? null,
      totalTTC: r.total_ttc ?? null,
      publicNote: r.note_public ?? null,
      privateNote: r.note_private ?? null,
      warehouseId: r.fk_warehouse != null && validWarehouseIds.has(r.fk_warehouse) ? r.fk_warehouse : null,
      source: r.source ?? null,
      paymentConditionId: r.fk_cond_reglement ?? null,
      paymentMethodId: r.fk_mode_reglement ?? null,
      isDraft: r.fk_statut === 0,  // no brouillon column; draft = status 0
      isBilled: r.facture === 1,
      validatedAt: r.date_valid ?? null,
      createdAt: r.date_creation ?? new Date(),
      updatedAt: r.tms ?? new Date(),
      entity: r.entity,
      importKey: r.import_key ?? null,
      // Extra fields
      nroSeguimiento: r.nrodeseguimiento ?? null,
      agencia: r.agencia ?? null,
    }));

    await upsertBatch('orders', mapped, ETL_CONFIG.batchSize);
    totalMigrated += mapped.length;
    offset += batchSize;
    log('orders', `  → Progress: ${totalMigrated}/${cnt}`);
  }

  await resetAutoIncrement('orders');
  log('orders', `✅ Migrated ${totalMigrated} orders`);
}
