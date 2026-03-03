/**
 * Migrator: llx_societe → third_parties
 */
import { srcQuery, upsertBatch, resetAutoIncrement } from '../db';
import { ETL_CONFIG } from '../etl.config';
import { log } from '../logger';

interface DolibarrSociete {
  rowid: number;
  nom: string;
  code_client: string | null;
  siren: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  zip: string | null;
  town: string | null;
  fk_pays: number | null;
  fk_departement: number | null;
  client: number | null;
  fournisseur: number | null;
  status: number | null;
  datec: Date | null;
  tms: Date | null;
  note_public: string | null;
  url: string | null;
  entity: number;
}

export async function migrateThirdParties(): Promise<void> {
  log('third-parties', 'Fetching from llx_societe...');

  const rows = await srcQuery<DolibarrSociete>(
    `SELECT rowid, nom, code_client, siren, email, phone, address, zip, town,
            fk_pays, fk_departement, client, fournisseur, status,
            datec, tms, note_public, url, entity
     FROM llx_societe
     WHERE entity = ?`,
    [ETL_CONFIG.entity],
  );

  log('third-parties', `Found ${rows.length} third parties`);
  if (!rows.length) return;

  const mapped = rows.map((r) => ({
    id: r.rowid,
    name: r.nom ?? '',
    clientCode: r.code_client ?? null,
    taxId: r.siren ?? null,
    email: r.email ?? null,
    phone: r.phone ?? null,
    address: r.address ?? null,
    postalCode: r.zip ?? null,
    city: r.town ?? null,
    countryId: r.fk_pays ?? null,
    provinceId: r.fk_departement ?? null,
    isClient: r.client ?? 0,
    isSupplier: r.fournisseur ?? 0,
    status: r.status ?? 1,
    createdAt: r.datec ?? new Date(),
    updatedAt: r.tms ?? new Date(),
    notes: r.note_public ?? null,
    website: r.url ?? null,
    entity: r.entity,
  }));

  const n = await upsertBatch('third_parties', mapped);
  await resetAutoIncrement('third_parties');
  log('third-parties', `✅ Migrated ${n} third parties`);
}
