/**
 * Migrator: llx_entrepot + llx_entrepot_extrafields → warehouses
 * Extra field: lowstock (boolean alert flag)
 */
import { srcQuery, upsertBatch, resetAutoIncrement } from '../db';
import { ETL_CONFIG } from '../etl.config';
import { log } from '../logger';

interface DolibarrWarehouse {
  rowid: number;
  ref: string;
  description: string | null;
  lieu: string | null;
  fk_parent: number | null;
  statut: number;
  datec: Date | null;
  tms: Date | null;
  entity: number;
  fk_user_author: number | null;
  // extra fields
  lowstock: number | null;
}

export async function migrateWarehouses(): Promise<void> {
  log('warehouses', 'Fetching from llx_entrepot + llx_entrepot_extrafields...');

  const rows = await srcQuery<DolibarrWarehouse>(
    `SELECT
       e.rowid, e.ref, e.description, e.lieu, e.fk_parent, e.statut,
       e.datec, e.tms, e.entity, e.fk_user_author,
       ee.lowstock
     FROM llx_entrepot e
     LEFT JOIN llx_entrepot_extrafields ee ON ee.fk_object = e.rowid
     WHERE e.entity = ?`,
    [ETL_CONFIG.entity],
  );

  log('warehouses', `Found ${rows.length} warehouses`);
  if (!rows.length) return;

  const mapped = rows.map((r) => ({
    id: r.rowid,
    name: r.ref ?? '',
    description: r.description ?? null,
    location: r.lieu ?? null,
    parentId: r.fk_parent ?? null,
    status: r.statut ?? 1,
    createdAt: r.datec ?? new Date(),
    updatedAt: r.tms ?? new Date(),
    entity: r.entity,
    createdByUserId: r.fk_user_author ?? null,
    // Extra field
    lowStock: r.lowstock === 1,
  }));

  const n = await upsertBatch('warehouses', mapped);
  await resetAutoIncrement('warehouses');
  log('warehouses', `✅ Migrated ${n} warehouses`);
}
