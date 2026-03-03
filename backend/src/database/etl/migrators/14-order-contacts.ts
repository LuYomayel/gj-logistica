/**
 * Migrator: llx_element_contact (orders) → order_contacts
 * Links contacts to orders with a role.
 * Note: llx_element_contact has 'datecreate' (not 'datec'), and no 'source_type' column.
 * We identify order contacts via element_id IN (SELECT rowid FROM llx_commande).
 */
import { srcQuery, upsertBatch, resetAutoIncrement } from '../db';
import { ETL_CONFIG } from '../etl.config';
import { log } from '../logger';

interface DolibarrElementContact {
  rowid: number;
  element_id: number;
  fk_socpeople: number;
  fk_c_type_contact: number | null;
  statut: number | null;
}

export async function migrateOrderContacts(): Promise<void> {
  log('order-contacts', 'Fetching from llx_element_contact (order contacts)...');

  const rows = await srcQuery<DolibarrElementContact>(
    `SELECT ec.rowid, ec.element_id, ec.fk_socpeople, ec.fk_c_type_contact, ec.statut
     FROM llx_element_contact ec
     WHERE ec.element_id IN (SELECT rowid FROM llx_commande WHERE entity = ?)
       AND ec.fk_socpeople IN (SELECT rowid FROM llx_socpeople WHERE entity = ?)`,
    [ETL_CONFIG.entity, ETL_CONFIG.entity],
  );

  log('order-contacts', `Found ${rows.length} order-contact links`);
  if (!rows.length) return;

  const mapped = rows.map((r) => ({
    id: r.rowid,
    orderId: r.element_id,
    contactId: r.fk_socpeople,
    role: r.fk_c_type_contact ? String(r.fk_c_type_contact) : null,
  }));

  const n = await upsertBatch('order_contacts', mapped);
  await resetAutoIncrement('order_contacts');
  log('order-contacts', `✅ Migrated ${n} order-contact links`);
}
