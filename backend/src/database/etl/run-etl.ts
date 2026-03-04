#!/usr/bin/env ts-node
/**
 * ETL Main Runner — Dolibarr → Deposito ERP
 *
 * Execution order (respects FK dependencies):
 *   1. groups
 *   2. users
 *   3. user_group_memberships
 *   4. third_parties
 *   5. sales_representatives
 *   6. contacts
 *   7. warehouses
 *   8. products          (5.888 rows — batched)
 *   9. product_prices
 *  10. product_stocks    (660 rows)
 *  11. stock_movements   (5.791 rows — batched)
 *  12. orders            (818 rows)
 *  13. order_lines
 *  14. order_contacts
 *  15. notification_settings + notification_logs
 *
 * Usage:
 *   npm run etl
 *   or:
 *   npx ts-node -r tsconfig-paths/register src/database/etl/run-etl.ts
 *
 * Required env vars (add to .env):
 *   SRC_DB_HOST, SRC_DB_PORT, SRC_DB_USER, SRC_DB_PASS, SRC_DB_NAME
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 *   ETL_DEFAULT_PASSWORD (optional, default: Temporal2026!)
 */

import { log, logError } from './logger';
import { closePools } from './db';
import { ETL_CONFIG } from './etl.config';

import { migrateGroups } from './migrators/01-groups';
import { migrateUsers } from './migrators/02-users';
import { migrateMemberships } from './migrators/03-memberships';
import { migrateThirdParties } from './migrators/04-third-parties';
import { migrateSalesReps } from './migrators/05-sales-reps';
import { migrateContacts } from './migrators/06-contacts';
import { migrateWarehouses } from './migrators/07-warehouses';
import { migrateProducts } from './migrators/08-products';
import { migrateProductPrices } from './migrators/09-product-prices';
import { migrateProductStocks } from './migrators/10-product-stocks';
import { migrateStockMovements } from './migrators/11-stock-movements';
import { migrateOrders } from './migrators/12-orders';
import { migrateOrderLines } from './migrators/13-order-lines';
import { migrateOrderContacts } from './migrators/14-order-contacts';
import { migrateNotifications } from './migrators/15-notifications';

interface MigrationStep {
  name: string;
  fn: () => Promise<void>;
}

const STEPS: MigrationStep[] = [
  { name: 'groups',               fn: migrateGroups },
  { name: 'users',                fn: migrateUsers },
  { name: 'memberships',          fn: migrateMemberships },
  { name: 'third-parties',        fn: migrateThirdParties },
  { name: 'sales-reps',           fn: migrateSalesReps },
  { name: 'contacts',             fn: migrateContacts },
  { name: 'warehouses',           fn: migrateWarehouses },
  { name: 'products',             fn: migrateProducts },
  { name: 'product-prices',       fn: migrateProductPrices },
  { name: 'product-stocks',       fn: migrateProductStocks },
  { name: 'stock-movements',      fn: migrateStockMovements },
  { name: 'orders',               fn: migrateOrders },
  { name: 'order-lines',          fn: migrateOrderLines },
  { name: 'order-contacts',       fn: migrateOrderContacts },
  { name: 'notifications',        fn: migrateNotifications },
];

async function main(): Promise<void> {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         ETL: Dolibarr → Deposito ERP                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  log('ETL', `Source DB: ${ETL_CONFIG.source.database}@${ETL_CONFIG.source.host}`);
  log('ETL', `Dest DB:   ${ETL_CONFIG.dest.database}@${ETL_CONFIG.dest.host}`);
  log('ETL', `Entity scope: ${ETL_CONFIG.entity}`);
  log('ETL', `Batch size: ${ETL_CONFIG.batchSize}`);
  console.log('');

  // Parse --only flag to run a single step (useful for partial reruns)
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const onlyStep = onlyArg?.split('=')[1];

  const steps = onlyStep
    ? STEPS.filter((s) => s.name === onlyStep)
    : STEPS;

  if (onlyStep && !steps.length) {
    console.error(`Step "${onlyStep}" not found. Available: ${STEPS.map((s) => s.name).join(', ')}`);
    process.exit(1);
  }

  const startAll = Date.now();
  let failed = 0;

  for (const step of steps) {
    const start = Date.now();
    try {
      await step.fn();
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      log('ETL', `Step [${step.name}] completed in ${elapsed}s`);
    } catch (err) {
      logError(step.name, err);
      failed++;
      // Continue with other steps (non-fatal) unless FK would break the chain
      // FK-critical breaks: if users fail, memberships will too — acceptable tradeoff
    }
    console.log('');
  }

  await closePools();

  const totalElapsed = ((Date.now() - startAll) / 1000).toFixed(1);
  console.log('╔══════════════════════════════════════════════════════════╗');
  if (failed === 0) {
    console.log(`║  ✅ ETL COMPLETE — ${totalElapsed}s — All steps succeeded.${' '.repeat(Math.max(0, 26 - totalElapsed.length))}║`);
  } else {
    console.log(`║  ⚠️  ETL DONE WITH ERRORS — ${failed} step(s) failed.${' '.repeat(Math.max(0, 24 - String(failed).length))}    ║`);
  }
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('⚠️  IMPORTANT POST-MIGRATION STEPS:');
  console.log('   1. Verify row counts match expected volumes');
  console.log(`   2. All users have password: "${ETL_CONFIG.defaultPassword}"`);
  console.log('   3. Tell users to change their passwords after first login');
  console.log('   4. Verify notification_settings emails are correct');
  console.log('   5. Run smoke test: log in + open a product + open an order');
  console.log('');
  console.log('📋 USER ROLE MAPPING APPLIED:');
  console.log('   admin=1 (Dolibarr admin)       → super_admin   (full system access)');
  console.log('   admin=0, no fk_soc (internal)  → client_admin  (manages Corteva tenant)');
  console.log('   admin=0, fk_soc set (external) → client_user   (standard tenant user)');
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  logError('ETL', err);
  process.exit(1);
});
