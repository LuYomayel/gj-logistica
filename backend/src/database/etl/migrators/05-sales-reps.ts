/**
 * Migrator: llx_societe_commerciaux → sales_representatives
 * Composite PK: (thirdPartyId, userId)
 * Note: llx_societe_commerciaux has no datec column — use NOW() as default.
 */
import { srcQuery, getDestPool } from '../db';
import { log } from '../logger';

interface DolibarrSalesRep {
  fk_soc: number;
  fk_user: number;
}

export async function migrateSalesReps(): Promise<void> {
  log('sales-reps', 'Fetching from llx_societe_commerciaux...');

  const rows = await srcQuery<DolibarrSalesRep>(
    `SELECT sc.fk_soc, sc.fk_user
     FROM llx_societe_commerciaux sc
     WHERE sc.fk_soc IN (SELECT rowid FROM llx_societe WHERE entity = 1)
       AND sc.fk_user IN (SELECT rowid FROM llx_user WHERE entity = 1)`,
  );

  log('sales-reps', `Found ${rows.length} sales rep assignments`);
  if (!rows.length) return;

  const dest = getDestPool();
  // Table has only thirdPartyId, userId (no assignedAt).
  let count = 0;
  for (const r of rows) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await dest.execute(
      `INSERT IGNORE INTO sales_representatives (thirdPartyId, userId) VALUES (?, ?)`,
      [r.fk_soc, r.fk_user] as any[],
    );
    count++;
  }

  log('sales-reps', `✅ Migrated ${count} sales rep assignments`);
}
