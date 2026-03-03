/**
 * Migrator: llx_product + llx_product_extrafields → products
 * Extra fields se obtienen por lote con SELECT * para ser compatibles con cualquier conjunto de columnas en origen.
 */
import { srcQuery, upsertBatch, resetAutoIncrement } from '../db';
import { ETL_CONFIG } from '../etl.config';
import { log } from '../logger';

interface DolibarrProduct {
  rowid: number;
  ref: string;
  label: string | null;
  description: string | null;
  barcode: string | null;
  fk_barcode_type: number | null;
  tobuy: number;
  tosell: number;
  fk_product_type: number;
  price: string | null;
  price_ttc: string | null;
  tva_tx: string | null;
  stock: number | null;
  seuil_stock_alerte: number | null;
  desiredstock: number | null;
  weight: number | null;
  weight_units: number | null;
  fk_unit: number | null;
  entity: number;
  note_public: string | null;
  fk_user_author: number | null;
  datec: Date | null;
  tms: Date | null;
}

/** Mapeo nombre columna Dolibarr (llx_product_extrafields) → nombre destino (products) */
const EXTRA_FIELD_MAP: Record<string, string> = {
  talle: 'talle',
  rubro: 'rubro',
  subrubro: 'subrubro',
  marca: 'marca',
  color: 'color',
  posicion: 'posicion',
  nivel_economico: 'nivelEconomico',
  imagen: 'imagen',
  descripcion_corta: 'descripcionCorta',
  keywords: 'keywords',
  ean_interno: 'eanInterno',
};

function getExtraValue(extraRow: Record<string, unknown> | null, destKey: string): unknown {
  if (!extraRow) return null;
  const srcKey = Object.keys(EXTRA_FIELD_MAP).find((k) => EXTRA_FIELD_MAP[k] === destKey);
  return srcKey != null ? extraRow[srcKey] ?? null : null;
}

export async function migrateProducts(): Promise<void> {
  log('products', 'Fetching from llx_product + llx_product_extrafields...');

  const userRows = await srcQuery<{ rowid: number }>(
    'SELECT rowid FROM llx_user WHERE entity = ?',
    [ETL_CONFIG.entity],
  );
  const validUserIds = new Set(userRows.map((u) => u.rowid));

  const [{ cnt }] = await srcQuery<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM llx_product WHERE entity = ?`,
    [ETL_CONFIG.entity],
  );
  log('products', `Found ${cnt} products — migrating in batches of ${ETL_CONFIG.batchSize}...`);

  let offset = 0;
  let totalMigrated = 0;
  const batchSize = Number(ETL_CONFIG.batchSize);

  while (offset < cnt) {
    const limit = Math.min(batchSize, cnt - offset);
    const rows = await srcQuery<DolibarrProduct>(
      `SELECT p.rowid, p.ref, p.label, p.description, p.barcode, p.fk_barcode_type,
              p.tobuy, p.tosell, p.fk_product_type, p.price, p.price_ttc, p.tva_tx,
              p.stock, p.seuil_stock_alerte, p.desiredstock, p.weight, p.weight_units,
              p.fk_unit, p.entity, p.note_public, p.fk_user_author, p.datec, p.tms
       FROM llx_product p
       WHERE p.entity = ?
       ORDER BY p.rowid
       LIMIT ${limit} OFFSET ${offset}`,
      [ETL_CONFIG.entity],
    );

    if (!rows.length) break;

    const ids = rows.map((r) => r.rowid);
    const extraRows = ids.length
      ? await srcQuery<Record<string, unknown> & { fk_object: number }>(
          `SELECT * FROM llx_product_extrafields WHERE fk_object IN (${ids.map(() => '?').join(',')})`,
          [...ids],
        )
      : [];
    const extraByProductId = new Map<number, Record<string, unknown>>();
    for (const er of extraRows) {
      extraByProductId.set(er.fk_object, er);
    }

    const mapped = rows.map((r) => {
      const extra = extraByProductId.get(r.rowid) ?? null;
      return {
        id: r.rowid,
        ref: r.ref ?? '',
        label: r.label ?? null,
        description: r.description ?? null,
        barcode: r.barcode ?? null,
        barcodeTypeId: r.fk_barcode_type ?? null,
        isBuyable: r.tobuy ?? 1,
        isSellable: r.tosell ?? 1,
        productType: r.fk_product_type ?? 0,
        price: r.price ?? null,
        priceTTC: r.price_ttc ?? null,
        vatRate: r.tva_tx ?? null,
        stock: r.stock ?? 0,
        stockAlertThreshold: r.seuil_stock_alerte ?? 0,
        desiredStock: r.desiredstock ?? 0,
        weight: r.weight ?? null,
        weightUnits: r.weight_units ?? null,
        unitId: r.fk_unit ?? null,
        status: r.tosell ?? 1,
        statusBuy: r.tobuy ?? 1,
        entity: r.entity,
        notes: r.note_public ?? null,
        createdByUserId: r.fk_user_author != null && validUserIds.has(r.fk_user_author) ? r.fk_user_author : null,
        createdAt: r.datec ?? new Date(),
        updatedAt: r.tms ?? new Date(),
        talle: getExtraValue(extra, 'talle'),
        rubro: getExtraValue(extra, 'rubro'),
        subrubro: getExtraValue(extra, 'subrubro'),
        marca: getExtraValue(extra, 'marca'),
        color: getExtraValue(extra, 'color'),
        posicion: getExtraValue(extra, 'posicion'),
        nivelEconomico: getExtraValue(extra, 'nivelEconomico'),
        imagen: getExtraValue(extra, 'imagen'),
        descripcionCorta: getExtraValue(extra, 'descripcionCorta'),
        keywords: getExtraValue(extra, 'keywords'),
        eanInterno: getExtraValue(extra, 'eanInterno'),
      };
    });

    await upsertBatch('products', mapped, batchSize);
    totalMigrated += mapped.length;
    offset += batchSize;
    log('products', `  → Progress: ${totalMigrated}/${cnt}`);
  }

  await resetAutoIncrement('products');
  log('products', `✅ Migrated ${totalMigrated} products`);
}
