/**
 * Migrator: llx_notify_def → notification_settings
 *           llx_notify      → notification_logs
 *
 * Only ORDER_VALIDATE and ORDER_CLOSE events are migrated (the only two used).
 * Notes:
 *   - llx_notify_def has no 'entity' column → hardcode ETL_CONFIG.entity
 *   - llx_notify has no 'entity', no 'reponse' column; datec field is 'daten'
 */
import { srcQuery, upsertBatch, resetAutoIncrement } from '../db';
import { ETL_CONFIG } from '../etl.config';
import { log } from '../logger';

interface DolibarrNotifyDef {
  rowid: number;
  datec: Date | null;
  action_code: string;
  fk_soc: number | null;
  fk_contact: number | null;
  type: string;
  fk_user: number | null;
  user_email: string | null;
}

interface DolibarrNotifyLog {
  rowid: number;
  daten: Date | null;       // actual column name in llx_notify (not 'datec')
  action_code: string;
  fk_soc: number | null;
  fk_contact: number | null;
  type: string;
  objet_type: string | null;
  objet_id: number | null;
  email: string | null;
}

export async function migrateNotifications(): Promise<void> {
  // ── Settings (llx_notify_def) ──────────────────────────────────────────

  log('notifications', 'Fetching notification settings from llx_notify_def...');

  const settingsRows = await srcQuery<DolibarrNotifyDef>(
    `SELECT nd.rowid, nd.datec, act.code AS action_code,
            nd.fk_soc, nd.fk_contact, nd.type, nd.fk_user,
            u.email AS user_email
     FROM llx_notify_def nd
     JOIN llx_c_action_trigger act ON act.rowid = nd.fk_action
     LEFT JOIN llx_user u ON u.rowid = nd.fk_user
     WHERE act.code IN ('ORDER_VALIDATE', 'ORDER_CLOSE')`,
  );

  log('notifications', `Found ${settingsRows.length} notification settings`);

  if (settingsRows.length) {
    const mappedSettings = settingsRows.map((r) => ({
      id: r.rowid,
      event: r.action_code,
      userId: r.fk_user ?? null,
      contactId: r.fk_contact ?? null,
      thirdPartyId: r.fk_soc ?? null,
      type: r.type ?? 'email',
      email: r.user_email ?? null,
      isActive: true,
      entity: ETL_CONFIG.entity,  // hardcoded — no entity column in llx_notify_def
      createdAt: r.datec ?? new Date(),
    }));

    await upsertBatch('notification_settings', mappedSettings);
    await resetAutoIncrement('notification_settings');
    log('notifications', `✅ Migrated ${mappedSettings.length} notification settings`);
  }

  // ── Logs (llx_notify) ─────────────────────────────────────────────────

  log('notifications', 'Fetching notification logs from llx_notify...');

  const logRows = await srcQuery<DolibarrNotifyLog>(
    `SELECT n.rowid, n.daten, act.code AS action_code, n.fk_soc, n.fk_contact,
            n.type, n.objet_type, n.objet_id, n.email
     FROM llx_notify n
     JOIN llx_c_action_trigger act ON act.rowid = n.fk_action
     WHERE act.code IN ('ORDER_VALIDATE', 'ORDER_CLOSE')`,
  );

  log('notifications', `Found ${logRows.length} notification logs`);

  if (logRows.length) {
    const mappedLogs = logRows.map((r) => ({
      id: r.rowid,
      event: r.action_code,
      entityType: r.objet_type ?? null,
      entityId: r.objet_id ?? null,
      email: r.email ?? null,
      response: null,             // no reponse column in llx_notify in this version
      thirdPartyId: r.fk_soc ?? null,
      contactId: r.fk_contact ?? null,
      entity: ETL_CONFIG.entity,  // hardcoded — no entity column in llx_notify
      createdAt: r.daten ?? new Date(),
    }));

    await upsertBatch('notification_logs', mappedLogs);
    await resetAutoIncrement('notification_logs');
    log('notifications', `✅ Migrated ${mappedLogs.length} notification logs`);
  }
}
