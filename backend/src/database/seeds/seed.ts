#!/usr/bin/env ts-node
/**
 * Seed script — fresh server initialization for GJ Logística ERP
 *
 * Run AFTER `npm run migration:run`.
 * Idempotent: safe to run multiple times without side effects.
 *
 * What it does:
 *   1. Ensures tenant Corteva (id=1) exists
 *   2. Ensures the full permissions catalog is populated (~48 permissions)
 *   3. Creates the initial super_admin user if it doesn't already exist
 *
 * Usage:
 *   npm run seed
 *   or:
 *   npx ts-node -r tsconfig-paths/register src/database/seeds/seed.ts
 *
 * Env vars (same as the app — read from .env):
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME   (required)
 *   SEED_ADMIN_USERNAME  (default: "admin")
 *   SEED_ADMIN_PASSWORD  (default: "Admin2026!")
 *
 * If migrating from Dolibarr, run `npm run etl` AFTER this seed.
 * The ETL will upsert users from Dolibarr, keeping the admin user from
 * this seed (different username) untouched.
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import mysql, { Pool } from 'mysql2/promise';
import * as bcrypt from 'bcryptjs';

// Load .env from backend root (same level as src/)
dotenv.config({ path: resolve(__dirname, '../../../../.env') });

// ── DB connection config (destination — the new system) ──────────────────────
const DB_CONFIG = {
  host:     process.env.DB_HOST     ?? 'localhost',
  port:     parseInt(process.env.DB_PORT ?? '3306', 10),
  user:     process.env.DB_USER     ?? 'root',
  password: process.env.DB_PASSWORD ?? 'rootpassword',
  database: process.env.DB_NAME     ?? 'gj_logistica',
  charset:  'utf8mb4',
  waitForConnections: true,
  connectionLimit:    3,
  timezone:           '+00:00',
};

// ── Seed config (overridable via env) ─────────────────────────────────────────
const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin2026!';

// ── Full permissions catalog ──────────────────────────────────────────────────
// Mirrors migration 1741000003000-CreatePermissionsTable.
// INSERT IGNORE keeps this idempotent even if migrations already seeded them.
const PERMISSIONS: Array<{ module: string; action: string; label: string; isAdvanced: boolean }> = [
  // ── Users ──────────────────────────────────────────────────────────────────
  { module: 'users', action: 'read',               label: 'Consultar usuarios',                              isAdvanced: false },
  { module: 'users', action: 'read_permissions',   label: 'Consultar permisos de otros usuarios',           isAdvanced: true  },
  { module: 'users', action: 'write',              label: 'Crear/modificar usuarios y sus permisos',        isAdvanced: false },
  { module: 'users', action: 'write_external',     label: 'Crear/modificar únicamente usuarios externos',   isAdvanced: true  },
  { module: 'users', action: 'write_password',     label: 'Modificar contraseña de otros usuarios',         isAdvanced: false },
  { module: 'users', action: 'delete',             label: 'Eliminar o desactivar otros usuarios',           isAdvanced: false },
  { module: 'users', action: 'read_own_perms',     label: 'Consultar propios permisos',                     isAdvanced: true  },
  { module: 'users', action: 'write_own_info',     label: 'Crear/modificar propia info de usuario',         isAdvanced: false },
  { module: 'users', action: 'write_own_password', label: 'Modificar propia contraseña',                    isAdvanced: false },
  { module: 'users', action: 'write_own_perms',    label: 'Modificar propios permisos',                     isAdvanced: true  },
  { module: 'users', action: 'read_groups',        label: 'Consultar grupos',                               isAdvanced: true  },
  { module: 'users', action: 'read_group_perms',   label: 'Consultar permisos de grupos',                   isAdvanced: true  },
  { module: 'users', action: 'write_groups',       label: 'Crear/modificar grupos y sus permisos',          isAdvanced: true  },
  { module: 'users', action: 'delete_groups',      label: 'Eliminar o desactivar grupos',                   isAdvanced: true  },
  { module: 'users', action: 'export',             label: 'Exportar usuarios',                              isAdvanced: false },

  // ── Third parties ──────────────────────────────────────────────────────────
  { module: 'third_parties', action: 'read',          label: 'Consultar empresas',                         isAdvanced: false },
  { module: 'third_parties', action: 'write',         label: 'Crear/modificar empresas',                   isAdvanced: false },
  { module: 'third_parties', action: 'delete',        label: 'Eliminar empresas',                          isAdvanced: false },
  { module: 'third_parties', action: 'export',        label: 'Exportar empresas',                          isAdvanced: false },
  { module: 'third_parties', action: 'write_payment', label: 'Crear/modificar información de pago',        isAdvanced: true  },
  { module: 'third_parties', action: 'expand_access', label: 'Ampliar acceso a todos los terceros',        isAdvanced: true  },

  // ── Contacts ───────────────────────────────────────────────────────────────
  { module: 'contacts', action: 'read',   label: 'Consultar contactos',       isAdvanced: false },
  { module: 'contacts', action: 'write',  label: 'Crear/modificar contactos', isAdvanced: false },
  { module: 'contacts', action: 'delete', label: 'Eliminar contactos',        isAdvanced: false },
  { module: 'contacts', action: 'export', label: 'Exportar contactos',        isAdvanced: false },

  // ── Orders ─────────────────────────────────────────────────────────────────
  { module: 'orders', action: 'read',          label: 'Consultar pedidos de clientes',           isAdvanced: false },
  { module: 'orders', action: 'write',         label: 'Crear/modificar pedidos de clientes',     isAdvanced: false },
  { module: 'orders', action: 'validate',      label: 'Validar pedidos de clientes',             isAdvanced: true  },
  { module: 'orders', action: 'generate_docs', label: 'Generar documentos de órdenes de venta', isAdvanced: true  },
  { module: 'orders', action: 'send',          label: 'Enviar pedidos de clientes',              isAdvanced: true  },
  { module: 'orders', action: 'close',         label: 'Cerrar pedidos de clientes',              isAdvanced: true  },
  { module: 'orders', action: 'cancel',        label: 'Anular pedidos de clientes',              isAdvanced: true  },
  { module: 'orders', action: 'delete',        label: 'Eliminar pedidos de clientes',            isAdvanced: false },
  { module: 'orders', action: 'export',        label: 'Exportar pedidos y atributos',            isAdvanced: false },

  // ── Products ───────────────────────────────────────────────────────────────
  { module: 'products', action: 'read',             label: 'Consultar productos',         isAdvanced: false },
  { module: 'products', action: 'write',            label: 'Crear/modificar productos',   isAdvanced: false },
  { module: 'products', action: 'read_prices',      label: 'Leer precios de productos',   isAdvanced: true  },
  { module: 'products', action: 'delete',           label: 'Eliminar productos',          isAdvanced: false },
  { module: 'products', action: 'export',           label: 'Exportar productos',          isAdvanced: false },
  { module: 'products', action: 'ignore_min_price', label: 'Ignorar precio mínimo',       isAdvanced: true  },

  // ── Stock / Inventories ────────────────────────────────────────────────────
  { module: 'stock', action: 'read',              label: 'Consultar stocks',                     isAdvanced: false },
  { module: 'stock', action: 'write_warehouses',  label: 'Crear/modificar almacenes',            isAdvanced: false },
  { module: 'stock', action: 'delete_warehouses', label: 'Eliminar almacenes',                   isAdvanced: false },
  { module: 'stock', action: 'read_movements',    label: 'Consultar movimientos de stock',        isAdvanced: false },
  { module: 'stock', action: 'write_movements',   label: 'Crear/modificar movimientos de stock',  isAdvanced: false },
  { module: 'stock', action: 'read_inventories',  label: 'Ver inventarios',                      isAdvanced: true  },
  { module: 'stock', action: 'write_inventories', label: 'Crear/modificar inventarios',          isAdvanced: true  },

  // ── Barcodes ───────────────────────────────────────────────────────────────
  { module: 'barcodes', action: 'generate', label: 'Generar hojas de códigos de barras', isAdvanced: false },
  { module: 'barcodes', action: 'write',    label: 'Crear/modificar códigos de barras',  isAdvanced: true  },
  { module: 'barcodes', action: 'delete',   label: 'Eliminar códigos de barras',         isAdvanced: true  },

  // ── Import / Export ────────────────────────────────────────────────────────
  { module: 'import', action: 'run', label: 'Lanzar importaciones masivas a la base de datos', isAdvanced: false },
  { module: 'export', action: 'run', label: 'Obtener resultado de una exportación',            isAdvanced: false },
];

// ── Logger ────────────────────────────────────────────────────────────────────
function log(msg: string): void {
  const ts = new Date().toISOString().slice(0, 19).replace('T', ' ');
  console.log(`[${ts}] [SEED] ${msg}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║        Seed: GJ Logística — fresh server setup           ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  log(`Database: ${DB_CONFIG.database}@${DB_CONFIG.host}:${DB_CONFIG.port}`);
  log(`Admin user: "${ADMIN_USERNAME}"`);
  console.log('');

  const pool: Pool = mysql.createPool(DB_CONFIG);

  try {
    // ── Step 1: Tenant Corteva ──────────────────────────────────────────────
    log('Step 1/3 — Ensuring tenant Corteva (id=1)...');
    await pool.execute(
      `INSERT IGNORE INTO \`tenants\` (\`id\`, \`name\`, \`code\`, \`isActive\`)
       VALUES (1, 'Corteva', 'CORTEVA', 1)`,
    );
    const [[tenantRow]] = await pool.execute(
      `SELECT id, name, code FROM \`tenants\` WHERE id = 1`,
    ) as unknown[][];

    if (tenantRow) {
      const t = tenantRow as { id: number; name: string; code: string };
      log(`  ✅ Tenant OK — id=${t.id}, name="${t.name}", code="${t.code}"`);
    } else {
      log('  ❌ Tenant Corteva NOT found after insert. Check if migrations have been run.');
      process.exit(1);
    }

    // ── Step 2: Permissions catalog ─────────────────────────────────────────
    log(`Step 2/3 — Seeding permissions catalog (${PERMISSIONS.length} entries)...`);
    let newPermsCount = 0;

    for (const p of PERMISSIONS) {
      const [result] = await pool.execute(
        `INSERT IGNORE INTO \`permissions\` (\`module\`, \`action\`, \`label\`, \`isAdvanced\`, \`isActive\`)
         VALUES (?, ?, ?, ?, 1)`,
        [p.module, p.action, p.label, p.isAdvanced ? 1 : 0],
      ) as [{ affectedRows: number }, unknown];

      if (result.affectedRows > 0) newPermsCount++;
    }

    const [[permCount]] = await pool.execute(
      `SELECT COUNT(*) AS n FROM \`permissions\``,
    ) as unknown[][];
    const total = (permCount as { n: number }).n;

    if (newPermsCount > 0) {
      log(`  ✅ Inserted ${newPermsCount} new permissions. Total in DB: ${total}`);
    } else {
      log(`  ✅ Permissions already seeded (${total} total) — nothing to insert`);
    }

    // ── Step 3: Initial super_admin user ────────────────────────────────────
    log(`Step 3/3 — Creating initial super_admin user "${ADMIN_USERNAME}"...`);

    const [[existing]] = await pool.execute(
      `SELECT id, username, userType FROM \`users\` WHERE username = ?`,
      [ADMIN_USERNAME],
    ) as unknown[][];

    if (existing) {
      const u = existing as { id: number; username: string; userType: string };
      log(`  ⏭  User "${u.username}" (id=${u.id}, type=${u.userType}) already exists — skipping`);
    } else {
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await pool.execute(
        `INSERT INTO \`users\`
           (\`username\`, \`passwordHash\`, \`firstName\`, \`lastName\`,
            \`isAdmin\`, \`userType\`, \`status\`, \`entity\`, \`language\`)
         VALUES (?, ?, 'Admin', 'GJ', 1, 'super_admin', 1, 1, 'es_AR')`,
        [ADMIN_USERNAME, passwordHash],
      );
      log(`  ✅ Created super_admin user "${ADMIN_USERNAME}"`);
      log(`  ⚠️  Password: "${ADMIN_PASSWORD}" — change it after first login!`);
    }

    // ── Summary ─────────────────────────────────────────────────────────────
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  ✅ SEED COMPLETE                                        ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Next steps:');
    console.log(`  1. Log in as "${ADMIN_USERNAME}" / "${ADMIN_PASSWORD}"`);
    console.log('  2. Change the admin password immediately from the UI');
    console.log('  3. Create permission groups and assign them to users');
    console.log('  4. If migrating from Dolibarr → run: npm run etl');
    console.log('     (ETL will upsert Corteva data; this seed user is unaffected)');
    console.log('');

  } catch (err) {
    console.error('');
    console.error('[SEED] ❌ Fatal error:', err);
    console.error('[SEED] Make sure migrations have been run first: npm run migration:run');
    console.error('');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[SEED] Unhandled error:', err);
  process.exit(1);
});
