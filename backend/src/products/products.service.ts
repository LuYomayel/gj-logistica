import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, FindOptionsWhere, ILike } from 'typeorm';
import { Product } from '../entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { FilterProductDto, ProductStatsDto } from './dto/filter-product.dto';

export class UpdateProductDto extends CreateProductDto {}

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
    private dataSource: DataSource,
  ) {}

  async findAll(filter: FilterProductDto): Promise<PaginatedProducts> {
    const { search, rubro, subrubro, marca, talle, color, lowStock, page = 1, limit = 50 } = filter;

    const qb = this.repo.createQueryBuilder('p');

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

    qb.skip((page - 1) * limit).take(limit).orderBy('p.ref', 'ASC');

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.repo.findOne({ where: { id } });
    if (!product) throw new NotFoundException(`Producto ${id} no encontrado`);
    return product;
  }

  async findByRef(ref: string): Promise<Product> {
    const product = await this.repo.findOne({ where: { ref } });
    if (!product) throw new NotFoundException(`Producto con ref '${ref}' no encontrado`);
    return product;
  }

  async create(dto: CreateProductDto, createdByUserId?: number): Promise<Product> {
    const existing = await this.repo.findOne({ where: { ref: dto.ref } });
    if (existing) throw new ConflictException(`Ref '${dto.ref}' ya existe`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const product = (this.repo.create({ ...(dto as any), createdByUserId: createdByUserId ?? null, status: 1, statusBuy: 1 } as any) as unknown) as Product;
    return this.repo.save(product);
  }

  async update(id: number, dto: Partial<UpdateProductDto>): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, dto);
    return this.repo.save(product);
  }

  async deactivate(id: number): Promise<Product> {
    const product = await this.findOne(id);
    product.status = 0;
    return this.repo.save(product);
  }

  async getLowStock(): Promise<Product[]> {
    return this.repo
      .createQueryBuilder('p')
      .where('p.stockAlertThreshold > 0')
      .andWhere('p.stock < p.stockAlertThreshold')
      .andWhere('p.status = 1')
      .orderBy('p.stock', 'ASC')
      .getMany();
  }

  /**
   * Export all products as a UTF-8 CSV string.
   */
  async exportCsv(): Promise<string> {
    const products = await this.repo.find({ order: { ref: 'ASC' } });

    const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const headers = [
      'Id', 'Ref', 'Etiqueta', 'Código de barras', 'Precio', 'IVA%',
      'Stock', 'Stock Alerta', 'Stock Deseado',
      'Rubro', 'SubRubro', 'Marca', 'Talle', 'Color', 'Posicion',
      'Nivel Económico', 'EAN Interno', 'Keywords', 'Estado Venta',
    ];
    const rows: string[] = [headers.map(q).join(',')];

    for (const p of products) {
      rows.push([
        p.id, p.ref, p.label ?? '', p.barcode ?? '',
        p.price ?? '', p.vatRate ?? '',
        p.stock, p.stockAlertThreshold, p.desiredStock,
        p.rubro ?? '', p.subrubro ?? '', p.marca ?? '',
        p.talle ?? '', p.color ?? '', p.posicion ?? '',
        p.nivelEconomico ?? '', p.eanInterno ?? '', p.keywords ?? '',
        p.isSellable,
      ].map(q).join(','));
    }
    return rows.join('\n');
  }

  /**
   * Import products from an Excel/CSV buffer.
   * Upserts by ref: creates if not found, updates if exists.
   */
  async importFromExcel(buffer: Buffer): Promise<{ created: number; updated: number; errors: string[] }> {
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
        const existing = await this.repo.findOne({ where: { ref } });
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
          await this.repo.save(this.repo.create({ ...data, status: 1, statusBuy: 1 }));
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
  async getStats(filter: ProductStatsDto): Promise<ProductStatsResult> {
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
