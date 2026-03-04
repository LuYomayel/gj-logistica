/**
 * Migrator: llx_user → users
 *
 * Passwords cannot be migrated (Dolibarr uses MD5-based hashing).
 * All users get a temporary bcrypt password defined in ETL_CONFIG.defaultPassword.
 * Users must change their password after first login.
 *
 * userType mapping (from Dolibarr flags → new multi-tenant system):
 *   admin=1                    → super_admin  (full system access, bypasses all guards)
 *   admin=0 AND fk_soc IS NULL → client_admin (internal Corteva staff, manages tenant data)
 *   admin=0 AND fk_soc IS NOT NULL → client_user (external user linked to a third-party company)
 */
import * as bcrypt from 'bcryptjs';
import { srcQuery, upsertBatch, resetAutoIncrement, getDestPool } from '../db';
import { ETL_CONFIG } from '../etl.config';
import { log } from '../logger';

interface DolibarrUser {
  rowid: number;
  login: string;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  office_phone: string | null;  // actual column name in llx_user
  fk_soc: number | null;
  fk_user: number | null;
  admin: number;
  statut: number;
  entity: number;
  datec: Date | null;
  tms: Date | null;
  photo: string | null;
  lang: string | null;
  note_public: string | null;
}

type UserType = 'super_admin' | 'client_admin' | 'client_user';

/**
 * Resolve the new-system userType from Dolibarr fields.
 *
 * - admin=1          → super_admin  : were full Dolibarr admins; get global bypass in new system
 * - admin=0, no fk_soc → client_admin: internal Corteva staff; manage their tenant's data & users
 * - admin=0, fk_soc set → client_user : external users linked to a customer company
 */
function resolveUserType(admin: number, fkSoc: number | null): UserType {
  if (admin === 1) return 'super_admin';
  if (fkSoc == null) return 'client_admin';
  return 'client_user';
}

export async function migrateUsers(): Promise<void> {
  log('users', 'Fetching from llx_user...');

  const rows = await srcQuery<DolibarrUser>(
    `SELECT rowid, login, firstname, lastname, email, office_phone,
            fk_soc, fk_user, admin, statut, entity, datec, tms,
            photo, lang, note_public
     FROM llx_user
     WHERE entity = ? AND login != ''`,
    [ETL_CONFIG.entity],
  );

  log('users', `Found ${rows.length} users — hashing passwords (this may take a moment)...`);
  if (!rows.length) return;

  // Pre-hash the default password once (all users get the same hash to save time)
  const passwordHash = await bcrypt.hash(ETL_CONFIG.defaultPassword, 12);

  // Count by type for reporting
  const typeCounts: Record<UserType, number> = { super_admin: 0, client_admin: 0, client_user: 0 };

  // Insert with supervisorId = null to satisfy self-referential FK; then set supervisorId via UPDATE.
  const mapped = rows.map((r) => {
    const userType = resolveUserType(r.admin, r.fk_soc);
    typeCounts[userType]++;
    return {
      id: r.rowid,
      username: r.login,
      passwordHash,
      firstName: r.firstname ?? null,
      lastName: r.lastname ?? null,
      email: r.email ?? null,
      phone: r.office_phone ?? null,
      thirdPartyId: r.fk_soc ?? null,
      supervisorId: null as number | null,
      isAdmin: r.admin === 1,
      userType,
      status: r.statut ?? 1,
      entity: r.entity,
      createdAt: r.datec ?? new Date(),
      updatedAt: r.tms ?? new Date(),
      avatarUrl: r.photo ?? null,
      language: r.lang ?? 'es_AR',
      notes: r.note_public ?? null,
    };
  });

  const dest = getDestPool();
  await dest.execute('SET FOREIGN_KEY_CHECKS = 0');
  try {
    const n = await upsertBatch('users', mapped);
    await resetAutoIncrement('users');

    let updated = 0;
    for (const r of rows) {
      if (r.fk_user != null) {
        await dest.execute(
          'UPDATE users SET supervisorId = ? WHERE id = ?',
          [r.fk_user, r.rowid],
        );
        updated++;
      }
    }
    if (updated) log('users', `  → Set supervisor for ${updated} user(s)`);

    log('users', `✅ Migrated ${n} users — default password: "${ETL_CONFIG.defaultPassword}"`);
    log('users', `   Role breakdown:`);
    log('users', `     super_admin  : ${typeCounts.super_admin}  (Dolibarr admins — full system access)`);
    log('users', `     client_admin : ${typeCounts.client_admin}  (internal Corteva staff — manage tenant)`);
    log('users', `     client_user  : ${typeCounts.client_user}  (external users linked to companies)`);
  } finally {
    await dest.execute('SET FOREIGN_KEY_CHECKS = 1');
  }

  log('users', '⚠️  Users must change their password after first login.');
}
