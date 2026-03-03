/**
 * Migrator: llx_usergroup → groups
 */
import { srcQuery, upsertBatch, resetAutoIncrement } from '../db';
import { ETL_CONFIG } from '../etl.config';
import { log } from '../logger';

interface DolibarrGroup {
  rowid: number;
  nom: string;
  note: string | null;
  entity: number;
  datec: Date | null;
  tms: Date | null;
}

export async function migrateGroups(): Promise<void> {
  log('groups', 'Fetching from llx_usergroup...');

  const rows = await srcQuery<DolibarrGroup>(
    `SELECT rowid, nom, note, entity, datec, tms FROM llx_usergroup WHERE entity = ?`,
    [ETL_CONFIG.entity],
  );

  log('groups', `Found ${rows.length} groups`);
  if (!rows.length) return;

  const mapped = rows.map((r) => ({
    id: r.rowid,
    name: r.nom ?? '',
    description: r.note ?? null,
    entity: r.entity,
    createdAt: r.datec ?? new Date(),
    updatedAt: r.tms ?? new Date(),
  }));

  const n = await upsertBatch('groups', mapped);
  await resetAutoIncrement('groups');
  log('groups', `✅ Migrated ${n} groups`);
}
