import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, FindOptionsWhere } from 'typeorm';
import { Product } from '../entities/product.entity';
import { Tenant } from '../entities/tenant.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { FilterProductDto, ProductStatsDto } from './dto/filter-product.dto';
import { buildRef, buildRefPrefix } from './ref-generator';

export class UpdateProductDto extends CreateProductDto {}

export interface ProductContext {
  userId: number;
  tenantId: number | null;
  userType: 'super_admin' | 'client_admin' | 'client_user';
}

export interface PaginatedProducts {
  items: Product[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductPopularItem {
  productId: number;
  ref: string;
  label: string | null;
  rubro: string | null;
  orderCount: number;
  totalQuantity: number;
}

export interface ProductStatsByRubro {
  rubro: string | null;
  productCount: number;
  orderCount: number;
}

export interface ProductStatsResult {
  popularProducts: ProductPopularItem[];
  byRubro: ProductStatsByRubro[];
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private repo: Repository<Product>,
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    private dataSource: DataSource,
  ) {}

  private isSuperAdmin(ctx: ProductContext): boolean {
    return ctx.tenantId === null;
  }

  private async assertTenantValid(tenantId: number): Promise<void> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new BadRequestException(`Organización #${tenantId} no encontrada`);
    if (!tenant.isActive) throw new BadRequestException(`Organización #${tenantId} está inactiva`);
  }

  private async resolveTenantForCreate(ctx: ProductContext, dtoTenantId: number | undefined): Promise<number> {
    if (this.isSuperAdmin(ctx)) {
      if (!dtoTenantId) throw new BadRequestException('Debe seleccionar una organización');
      await this.assertTenantValid(dtoTenantId);
      return dtoTenantId;
    }
    return ctx.tenantId as number;
  }

  /** Devuelve el prefijo de ref (PREFIX) para una organización, a partir de su `code`. */
  private async resolvePrefix(entity: number): Promise<string> {
    const tenant = await this.tenantRepo.findOne({ where: { id: entity } });
    if (!tenant) throw new BadRequestException(`Organización #${entity} no encontrada`);
    const prefix = buildRefPrefix(tenant.code);
    if (!prefix) {
      throw new BadRequestException(`La organización #${entity} no tiene un código válido para generar la referencia`);
    }
    return prefix;
  }

  /**
   * Reserva atómicamente el siguiente número de la secuencia del tenant y devuelve
   * el ref `PREFIX-N`. Usa el truco INSERT ... ON DUPLICATE KEY UPDATE + LAST_INSERT_ID
   * (connection-local, sin race) — mismo patrón que `order_sequences`.
   * Si un ref manual ya ocupó ese número, avanza hasta el primero libre.
   */
  private async reserveNextRef(manager: EntityManager, entity: number, prefix: string): Promise<string> {
    await manager.query(
      'INSERT INTO product_ref_sequences (entity, currentSeq) VALUES (?, LAST_INSERT_ID(1)) ' +
        'ON DUPLICATE KEY UPDATE currentSeq = LAST_INSERT_ID(currentSeq + 1)',
      [entity],
    );
    let rows = await manager.query('SELECT LAST_INSERT_ID() AS seq');
    let n = Number(rows[0].seq);
    let ref = buildRef(prefix, n);

    let guard = 0;
    while (guard++ < 10000 && (await manager.findOne(Product, { where: { ref, entity } }))) {
      await manager.query(
        'UPDATE product_ref_sequences SET currentSeq = LAST_INSERT_ID(currentSeq + 1) WHERE entity = ?',
        [entity],
      );
      rows = await manager.query('SELECT LAST_INSERT_ID() AS seq');
      n = Number(rows[0].seq);
      ref = buildRef(prefix, n);
    }
    return ref;
  }

  /**
   * Calcula (sin consumir) el próximo ref `PREFIX-N` para mostrar de preview en el
   * formulario. Para super_admin requiere `tenantIdParam`; el resto usa su propio tenant.
   */
  async peekNextRef(ctx: ProductContext, tenantIdParam?: number): Promise<{ ref: string; prefix: string }> {
    let entity: number;
    if (this.isSuperAdmin(ctx)) {
      if (!tenantIdParam) throw new BadRequestException('Debe seleccionar una organización');
      await this.assertTenantValid(tenantIdParam);
      entity = tenantIdParam;
    } else {
      entity = ctx.tenantId as number;
    }
    const prefix = await this.resolvePrefix(entity);
    const seqRows = await this.dataSource.query(
      'SELECT currentSeq FROM product_ref_sequences WHERE entity = ?',
      [entity],
    );
    let n = seqRows.length ? Number(seqRows[0].currentSeq) + 1 : 1;
    let guard = 0;
    while (guard++ < 10000 && (await this.repo.findOne({ where: { ref: buildRef(prefix, n), entity } }))) {
      n++;
    }
    return { ref: buildRef(prefix, n), prefix };
  }

  async findAll(filter: FilterProductDto, ctx: ProductContext): Promise<PaginatedProducts> {
    const { search, rubro, subrubro, marca, talle, color, lowStock, tenantId: filterTenantId, page = 1, limit = 50 } = filter;

    const qb = this.repo.createQueryBuilder('p')
      .leftJoinAndSelect('p.tenant', 'tenant')
      .andWhere('p.status = 1');

    if (search) {
      qb.andWhere(
        '(p.ref LIKE :s OR p.label LIKE :s OR p.barcode LIKE :s OR p.keywords LIKE :s)',
        { s: `%${search}%` },
      );
    }
    if (rubro) qb.andWhere('p.rubro LIKE :rubro', { rubro: `%${rubro}%` });
    if (subrubro) qb.andWhere('p.subrubro LIKE :subrubro', { subrubro: `%${subrubro}%` });
    if (marca) qb.andWhere('p.marca LIKE :marca', { marca: `%${marca}%` });
    if (talle) qb.andWhere('p.talle LIKE :talle', { talle: `%${talle}%` });
    if (color) qb.andWhere('p.color LIKE :color', { color: `%${color}%` });
    if (lowStock) qb.andWhere('p.stock < p.stockAlertThreshold');

    // Tenant scoping: client users locked to own tenant; super_admin can filter or see all.
    if (this.isSuperAdmin(ctx)) {
      if (filterTenantId) qb.andWhere('p.entity = :tenantId', { tenantId: filterTenantId });
    } else {
      qb.andWhere('p.entity = :tenantId', { tenantId: ctx.tenantId });
    }

    // Orden natural del ref: primero el prefijo (alfabético), luego el número
    // final como entero, para que ADAMA-2 < ADAMA-11 < ADAMA-20 (no lexicográfico).
    qb.skip((page - 1) * limit)
      .take(limit)
      .orderBy("REGEXP_REPLACE(p.ref, '-[0-9]+$', '')", 'ASC')
      .addOrderBy("CAST(REGEXP_SUBSTR(p.ref, '[0-9]+$') AS UNSIGNED)", 'ASC')
      .addOrderBy('p.ref', 'ASC');

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async findOne(id: number, ctx: ProductContext): Promise<Product> {
    const where: FindOptionsWhere<Product> = { id };
    if (!this.isSuperAdmin(ctx)) where.entity = ctx.tenantId as number;
    const product = await this.repo.findOne({ where, relations: ['tenant'] });
    if (!product) throw new NotFoundException(`Producto ${id} no encontrado`);
    return product;
  }

  async findByRef(ref: string, ctx: ProductContext): Promise<Product> {
    const where: FindOptionsWhere<Product> = { ref };
    if (!this.isSuperAdmin(ctx)) where.entity = ctx.tenantId as number;
    const product = await this.repo.findOne({ where });
    if (!product) throw new NotFoundException(`Producto con ref '${ref}' no encontrado`);
    return product;
  }

  async create(dto: CreateProductDto, ctx: ProductContext): Promise<Product> {
    const effectiveEntity = await this.resolveTenantForCreate(ctx, dto.tenantId);
    const { tenantId: _tenantIdIgnored, autoRef, ref: providedRef, ...rest } = dto;

    // Autogeneración: ref = PREFIX-N reservado atómicamente dentro de una transacción.
    if (autoRef) {
      const prefix = await this.resolvePrefix(effectiveEntity);
      const qr = this.dataSource.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        const ref = await this.reserveNextRef(qr.manager, effectiveEntity, prefix);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const product = qr.manager.create(Product, {
          ...(rest as any),
          ref,
          createdByUserId: ctx.userId ?? null,
          status: 1,
          statusBuy: 1,
          entity: effectiveEntity,
        } as any);
        const saved = await qr.manager.save(product);
        await qr.commitTransaction();
        return saved;
      } catch (e) {
        await qr.rollbackTransaction();
        throw e;
      } finally {
        await qr.release();
      }
    }

    // Ref manual (lo edita el usuario): se respeta tal cual, con validación de unicidad.
    if (!providedRef) throw new BadRequestException('La referencia del producto es obligatoria');
    const existing = await this.repo.findOne({ where: { ref: providedRef, entity: effectiveEntity } });
    if (existing) throw new ConflictException(`Ref '${providedRef}' ya existe en este tenant`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const product = (this.repo.create({
      ...(rest as any),
      ref: providedRef,
      createdByUserId: ctx.userId ?? null,
      status: 1,
      statusBuy: 1,
      entity: effectiveEntity,
    } as any) as unknown) as Product;
    return this.repo.save(product);
  }

  async update(id: number, dto: Partial<UpdateProductDto>, ctx: ProductContext): Promise<Product> {
    const product = await this.findOne(id, ctx);
    const { tenantId: dtoTenantId, autoRef: _autoRefIgnored, ...rest } = dto;

    Object.assign(product, rest);

    if (dtoTenantId !== undefined && this.isSuperAdmin(ctx) && dtoTenantId !== product.entity) {
      await this.assertTenantValid(dtoTenantId);
      product.entity = dtoTenantId;
      // Must also update the relation — TypeORM uses `tenant.id` over `entity`
      // when both are set, and `findOne` loaded `tenant` with the old id.
      product.tenant = { id: dtoTenantId } as Tenant;
      // Decisión: al cambiar la organización, se regenera el ref con el nuevo prefijo.
      const prefix = await this.resolvePrefix(dtoTenantId);
      product.ref = await this.reserveNextRef(this.dataSource.manager, dtoTenantId, prefix);
    }

    return this.repo.save(product);
  }

  async deactivate(id: number, ctx: ProductContext): Promise<Product> {
    const product = await this.findOne(id, ctx);
    product.status = 0;
    return this.repo.save(product);
  }

  async getLowStock(tenantId: number | null): Promise<Product[]> {
    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.stockAlertThreshold > 0')
      .andWhere('p.stock < p.stockAlertThreshold')
      .andWhere('p.status = 1');

    if (tenantId !== null) qb.andWhere('p.entity = :tenantId', { tenantId });

    return qb.orderBy('p.stock', 'ASC').getMany();
  }

  /**
   * Export all products as a UTF-8 CSV string.
   */
  async exportCsv(tenantId: number | null, includePosition = true): Promise<string> {
    const qb = this.repo.createQueryBuilder('p').orderBy('p.ref', 'ASC');
    if (tenantId !== null) qb.andWhere('p.entity = :tenantId', { tenantId });
    const products = await qb.getMany();

    const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const headers = [
      'Id', 'Ref', 'Etiqueta', 'Código de barras', 'Precio', 'IVA%',
      'Stock', 'Stock Alerta', 'Stock Deseado',
      'Rubro', 'SubRubro', 'Marca', 'Talle', 'Color',
      ...(includePosition ? ['Posicion'] : []),
      'Nivel Económico', 'EAN Interno', 'Keywords', 'Estado Venta',
    ];
    const rows: string[] = [headers.map(q).join(',')];

    for (const p of products) {
      const fields: unknown[] = [
        p.id, p.ref, p.label ?? '', p.barcode ?? '',
        p.price ?? '', p.vatRate ?? '',
        p.stock, p.stockAlertThreshold, p.desiredStock,
        p.rubro ?? '', p.subrubro ?? '', p.marca ?? '',
        p.talle ?? '', p.color ?? '',
        ...(includePosition ? [p.posicion ?? ''] : []),
        p.nivelEconomico ?? '', p.eanInterno ?? '', p.keywords ?? '',
        p.isSellable,
      ];
      rows.push(fields.map(q).join(','));
    }
    return rows.join('\n');
  }

  /**
   * Import products from an Excel/CSV buffer.
   * Upserts by ref: creates if not found, updates if exists.
   */
  async importFromExcel(buffer: Buffer, userId?: number, tenantId?: number | null): Promise<{ created: number; updated: number; errors: string[] }> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const xlsx = require('xlsx') as typeof import('xlsx');
    const wb = xlsx.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1 });

    if (rows.length < 2) return { created: 0, updated: 0, errors: ['El archivo no tiene datos'] };

    const rawHeaders: string[] = (rows[0] as string[]).map((h) => String(h ?? '').toLowerCase().trim());
    const col = (name: string) => {
      const aliases: string[] = [name, ...[]];
      for (const a of [name]) {
        const idx = rawHeaders.indexOf(a.toLowerCase());
        if (idx >= 0) return idx;
      }
      return -1;
    };
    const get = (row: unknown[], header: string) => {
      const idx = col(header);
      return idx >= 0 ? row[idx] ?? null : null;
    };

    let created = 0, updated = 0;
    const errors: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as unknown[];
      const ref = String(get(row, 'ref') ?? '').trim();
      if (!ref) continue;

      try {
        const existing = await this.repo.findOne({ where: { ref, entity: tenantId ?? 1 } });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: Record<string, any> = { ref };

        const str = (h: string) => { const v = get(row, h); return v !== null ? String(v).trim() || undefined : undefined; };
        const num = (h: string) => { const v = get(row, h); return v !== null && v !== '' ? Number(v) : undefined; };

        data.label = str('etiqueta') ?? str('label');
        data.barcode = str('código de barras') ?? str('barcode');
        data.price = num('precio') ?? num('price');
        data.vatRate = num('iva%') ?? num('vatrate');
        data.stockAlertThreshold = num('stock alerta') ?? num('stockalertthreshold');
        data.desiredStock = num('stock deseado') ?? num('desiredstock');
        data.rubro = str('rubro');
        data.subrubro = str('subrubro');
        data.marca = str('marca');
        data.talle = str('talle');
        data.color = str('color');
        data.posicion = str('posicion') ?? str('posición');
        data.nivelEconomico = str('nivel económico') ?? str('nivel economico') ?? str('niveleconomico');
        data.eanInterno = str('ean interno') ?? str('eaninterno');
        data.keywords = str('keywords');

        // Remove undefined keys so we don't overwrite with undefined
        for (const k of Object.keys(data)) {
          if (data[k] === undefined) delete data[k];
        }

        if (existing) {
          await this.repo.update(existing.id, data);
          updated++;
        } else {
          await this.repo.save(this.repo.create({ ...data, status: 1, statusBuy: 1, entity: tenantId ?? 1 }));
          created++;
        }
      } catch (err) {
        errors.push(`Fila ${i + 1} (ref="${ref}"): ${(err as Error).message}`);
      }
    }

    return { created, updated, errors };
  }

  /**
   * Estadísticas de productos: popularidad por pedidos + desglose por rubro.
   */
  async getStats(filter: ProductStatsDto, tenantId: number | null): Promise<ProductStatsResult> {
    const { year, thirdPartyId, productId } = filter;

    // ── Top productos por cantidad de pedidos ───────────────────────────
    const popularQb = this.dataSource
      .createQueryBuilder()
      .select([
        'ol.productId AS productId',
        'p.ref AS ref',
        'p.label AS label',
        'p.rubro AS rubro',
        'COUNT(DISTINCT o.id) AS orderCount',
        'COALESCE(SUM(ol.quantity), 0) AS totalQuantity',
      ])
      .from('order_lines', 'ol')
      .innerJoin('orders', 'o', 'o.id = ol.orderId')
      .leftJoin('products', 'p', 'p.id = ol.productId')
      .where('ol.productId IS NOT NULL')
      .andWhere('o.status != -1');

    if (year) popularQb.andWhere('YEAR(o.orderDate) = :year', { year });
    if (thirdPartyId) popularQb.andWhere('o.thirdPartyId = :thirdPartyId', { thirdPartyId });
    if (productId) popularQb.andWhere('ol.productId = :productId', { productId });
    if (tenantId !== null) popularQb.andWhere('p.entity = :tenantId', { tenantId });

    popularQb
      .groupBy('ol.productId, p.ref, p.label, p.rubro')
      .orderBy('orderCount', 'DESC')
      .limit(50);

    const popularRows = await popularQb.getRawMany();

    // ── Desglose por rubro ──────────────────────────────────────────────
    const rubroQb = this.dataSource
      .createQueryBuilder()
      .select([
        'p.rubro AS rubro',
        'COUNT(DISTINCT p.id) AS productCount',
        'COUNT(DISTINCT o.id) AS orderCount',
      ])
      .from('order_lines', 'ol')
      .innerJoin('orders', 'o', 'o.id = ol.orderId')
      .leftJoin('products', 'p', 'p.id = ol.productId')
      .where('ol.productId IS NOT NULL')
      .andWhere('o.status != -1');

    if (year) rubroQb.andWhere('YEAR(o.orderDate) = :year', { year });
    if (thirdPartyId) rubroQb.andWhere('o.thirdPartyId = :thirdPartyId', { thirdPartyId });
    if (tenantId !== null) rubroQb.andWhere('p.entity = :tenantId', { tenantId });

    rubroQb.groupBy('p.rubro').orderBy('orderCount', 'DESC');

    const rubroRows = await rubroQb.getRawMany();

    return {
      popularProducts: popularRows.map((r) => ({
        productId: Number(r.productId),
        ref: r.ref,
        label: r.label,
        rubro: r.rubro,
        orderCount: Number(r.orderCount),
        totalQuantity: Number(r.totalQuantity),
      })),
      byRubro: rubroRows.map((r) => ({
        rubro: r.rubro,
        productCount: Number(r.productCount),
        orderCount: Number(r.orderCount),
      })),
    };
  }
}
