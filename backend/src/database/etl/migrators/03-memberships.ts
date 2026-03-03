/**
 * Migrator: llx_usergroup_user → user_group_memberships
 * Composite PK: (userId, groupId)
 * Note: llx_usergroup_user has no datec column — use NOW() as default.
 */
import { srcQuery, getDestPool } from '../db';
import { log } from '../logger';

interface DolibarrMembership {
  fk_user: number;
  fk_usergroup: number;
}

export async function migrateMemberships(): Promise<void> {
  log('memberships', 'Fetching from llx_usergroup_user...');

  const rows = await srcQuery<DolibarrMembership>(
    `SELECT ugu.fk_user, ugu.fk_usergroup
     FROM llx_usergroup_user ugu
     WHERE ugu.fk_user IN (SELECT rowid FROM llx_user WHERE entity = 1)
       AND ugu.fk_usergroup IN (SELECT rowid FROM llx_usergroup WHERE entity = 1)`,
  );

  log('memberships', `Found ${rows.length} memberships`);
  if (!rows.length) return;

  const dest = getDestPool();
  // Insert with composite PK — use INSERT IGNORE to skip duplicates. Table has userId, groupId, entity (no joinedAt).
  let count = 0;
  for (const r of rows) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await dest.execute(
      `INSERT IGNORE INTO user_group_memberships (userId, groupId, entity) VALUES (?, ?, 1)`,
      [r.fk_user, r.fk_usergroup] as any[],
    );
    count++;
  }

  log('memberships', `✅ Migrated ${count} memberships`);
}
