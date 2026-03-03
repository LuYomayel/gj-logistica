/**
 * Migrator: llx_socpeople + llx_socpeople_extrafields → contacts
 * Extra fields are merged as regular columns (not EAV).
 * Note: llx_socpeople uses 'phone' not 'phone_pro'.
 */
import { srcQuery, upsertBatch, resetAutoIncrement } from '../db';
import { ETL_CONFIG } from '../etl.config';
import { log } from '../logger';

interface DolibarrContact {
  rowid: number;
  fk_soc: number | null;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  phone: string | null;         // actual column name in llx_socpeople
  phone_mobile: string | null;
  zip: string | null;
  address: string | null;
  town: string | null;
  statut: number;
  datec: Date | null;
  tms: Date | null;
  note_public: string | null;
  canvas: string | null;
  // extra fields
  marca: string | null;
  dni: number | null;
  lugardeentrega: string | null;
  nombrefantasia: string | null;
}

export async function migrateContacts(): Promise<void> {
  log('contacts', 'Fetching from llx_socpeople + llx_socpeople_extrafields...');

  const rows = await srcQuery<DolibarrContact>(
    `SELECT
       sp.rowid, sp.fk_soc, sp.firstname, sp.lastname, sp.email,
       sp.phone, sp.phone_mobile, sp.zip, sp.address, sp.town,
       sp.statut, sp.datec, sp.tms, sp.note_public, sp.canvas,
       spe.marca, spe.dni, spe.lugardeentrega, spe.nombrefantasia
     FROM llx_socpeople sp
     LEFT JOIN llx_socpeople_extrafields spe ON spe.fk_object = sp.rowid
     WHERE sp.entity = ?`,
    [ETL_CONFIG.entity],
  );

  log('contacts', `Found ${rows.length} contacts`);
  if (!rows.length) return;

  const mapped = rows.map((r) => ({
    id: r.rowid,
    thirdPartyId: r.fk_soc ?? null,
    firstName: r.firstname ?? null,
    lastName: r.lastname ?? null,
    email: r.email ?? null,
    phonePro: r.phone ?? null,
    phoneMobile: r.phone_mobile ?? null,
    postalCode: r.zip ?? null,
    address: r.address ?? null,
    city: r.town ?? null,
    status: r.statut ?? 1,
    createdAt: r.datec ?? new Date(),
    updatedAt: r.tms ?? new Date(),
    notes: r.note_public ?? null,
    alias: r.canvas ?? null,
    // Extra fields
    marca: r.marca ?? null,
    dni: r.dni ?? null,
    lugarDeEntrega: r.lugardeentrega ?? null,
    nombreFantasia: r.nombrefantasia ?? null,
  }));

  const n = await upsertBatch('contacts', mapped);
  await resetAutoIncrement('contacts');
  log('contacts', `✅ Migrated ${n} contacts`);
}
