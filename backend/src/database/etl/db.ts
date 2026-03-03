/**
 * Database connection helpers for the ETL.
 * Uses mysql2/promise directly (not TypeORM) to allow explicit ID inserts
 * and upsert patterns without fighting TypeORM's auto-increment behavior.
 */

import mysql, { Pool, PoolConnection } from 'mysql2/promise';
import { ETL_CONFIG } from './etl.config';

let srcPool: Pool | null = null;
let destPool: Pool | null = null;

export function getSrcPool(): Pool {
  if (!srcPool) {
    srcPool = mysql.createPool({
      ...ETL_CONFIG.source,
      waitForConnections: true,
      connectionLimit: 5,
      timezone: '+00:00',
    });
  }
  return srcPool;
}

export function getDestPool(): Pool {
  if (!destPool) {
    destPool = mysql.createPool({
      ...ETL_CONFIG.dest,
      waitForConnections: true,
      connectionLimit: 5,
      timezone: '+00:00',
    });
  }
  return destPool;
}

/** Execute a SELECT on the source Dolibarr DB. Returns all rows. */
export async function srcQuery<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rows] = await getSrcPool().execute(sql, params as any[]);
  return rows as T[];
}

/** Execute a statement on the destination DB. Returns OkPacket. */
export async function destExec(
  sql: string,
  params: unknown[] = [],
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await getDestPool().execute(sql, params as any[]);
}

/**
 * Upsert rows into a destination table in batches.
 * Uses INSERT ... ON DUPLICATE KEY UPDATE to be idempotent.
 *
 * @param table  Destination table name
 * @param rows   Array of objects (column → value maps)
 * @param batchSize  Rows per INSERT statement
 */
export async function upsertBatch(
  table: string,
  rows: Record<string, unknown>[],
  batchSize = ETL_CONFIG.batchSize,
): Promise<number> {
  if (!rows.length) return 0;

  const dest = getDestPool();
  const columns = Object.keys(rows[0]);
  const colList = columns.map((c) => `\`${c}\``).join(', ');
  const updateList = columns
    .filter((c) => c !== 'id') // don't update PK
    .map((c) => `\`${c}\` = VALUES(\`${c}\`)`)
    .join(', ');

  let inserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const placeholders = batch.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
    const values = batch.flatMap((r) => columns.map((c) => r[c] ?? null));

    const sql = `INSERT INTO \`${table}\` (${colList}) VALUES ${placeholders} ON DUPLICATE KEY UPDATE ${updateList}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await dest.execute(sql, values as any[]);
    inserted += batch.length;
  }

  return inserted;
}

/**
 * Reset AUTO_INCREMENT on a table to MAX(id)+1.
 * Run after all rows are inserted.
 */
export async function resetAutoIncrement(table: string): Promise<void> {
  const dest = getDestPool();
  const [[row]] = await dest.execute(`SELECT COALESCE(MAX(id), 0) + 1 AS next FROM \`${table}\``) as unknown[][];
  const next = (row as { next: number }).next;
  // Use query() with template literal — ALTER TABLE DDL does not support ? placeholders
  await dest.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = ${next}`);
}

export async function closePools(): Promise<void> {
  if (srcPool) await srcPool.end();
  if (destPool) await destPool.end();
  srcPool = null;
  destPool = null;
}
