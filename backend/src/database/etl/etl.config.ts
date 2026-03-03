/**
 * ETL Configuration
 *
 * Source DB: Dolibarr 18.0.0 MySQL
 * Dest DB:   New NestJS system MySQL
 *
 * Set via environment variables. Can be the same server with different DB names.
 * Recommended: copy .env and add SRC_DB_* variables.
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env from backend root
dotenv.config({ path: resolve(__dirname, '../../../../.env') });

export const ETL_CONFIG = {
  /** Dolibarr source database */

  source: {
    host: process.env.SRC_DB_HOST ?? 'localhost',
    port: parseInt(process.env.SRC_DB_PORT ?? '3306', 10),
    user: process.env.SRC_DB_USER ?? 'root',
    password: process.env.SRC_DB_PASS ?? 'rootpassword',
    database: process.env.SRC_DB_NAME ?? 'dolibarr_corteva',
    charset: 'utf8mb4',
  },
  /** New system destination database */
  dest: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? 'rootpassword',
    database: process.env.DB_NAME ?? 'gj_logistica',
    charset: 'utf8mb4',
  },
  /** Dolibarr entity scope (1 = empresa principal) */
  entity: 1,
  /** Default password for migrated users (bcrypt of this string) */
  defaultPassword: process.env.ETL_DEFAULT_PASSWORD ?? 'Temporal2026!',
  /** Batch size for bulk inserts */
  batchSize: 500,
};
