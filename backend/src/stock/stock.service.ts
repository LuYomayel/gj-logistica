import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StockMovement } from '../entities/stock-movement.entity';
import { ProductStock } from '../entities/product-stock.entity';
import { Product } from '../entities/product.entity';
import {
  CreateStockMovementDto, FilterMovementsDto,
  TransferStockDto, StockAtDateDto,
} from './dto/create-stock-movement.dto';

export interface PaginatedMovements {
  items: StockMovement[];
  total: number;
  page: number;
  limit: number;
}

export interface StockAtDateItem {
  productId: number;
  ref: string;
  label: string | null;
  stockAtDate: number;
  currentStock: number;
}

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(StockMovement) private movementRepo: Repository<StockMovement>,
    @InjectRepository(ProductStock) private stockRepo: Repository<ProductStock>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    private dataSource: DataSource,
  ) {}

  async findMovements(filter: FilterMovementsDto, tenantId: number | null): Promise<PaginatedMovements> {
    const { warehouseId, productId, originType, page = 1, limit = 50 } = filter;

    const qb = this.movementRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.product', 'p')
      .leftJoinAndSelect('m.warehouse', 'w');

    if (warehouseId) qb.andWhere('m.warehouseId = :warehouseId', { warehouseId });
    if (productId) qb.andWhere('m.productId = :productId', { productId });
    if (originType) qb.andWhere('m.originType = :originType', { originType });
    if (tenantId !== null) qb.andWhere('m.entity = :tenantId', { tenantId });

    qb.orderBy('m.movedAt', 'DESC').skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async getProductMovements(productId: number, tenantId: number | null): Promise<StockMovement[]> {
    const where: { productId: number; entity?: number } = { productId };
    if (tenantId !== null) where.entity = tenantId;
    return this.movementRepo.find({
      where,
      order: { movedAt: 'DESC' },
      take: 100,
    });
  }

  /**
   * Manual stock correction (movementType=0)
   */
  async createManualMovement(
    dto: CreateStockMovementDto,
    createdByUserId: number,
    tenantId: number | null,
  ): Promise<StockMovement> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const stockRepo = qr.manager.getRepository(ProductStock);
      const movementRepo = qr.manager.getRepository(StockMovement);
      const productRepo = qr.manager.getRepository(Product);

      let ps = await stockRepo.findOne({
        where: { warehouseId: dto.warehouseId, productId: dto.productId },
      });

      const newQty = (ps?.quantity ?? 0) + dto.quantity;
      if (newQty < 0) {
        throw new BadRequestException(
          `Stock insuficiente: disponible ${ps?.quantity ?? 0}, movimiento ${dto.quantity}`,
        );
      }

      if (ps) {
        ps.quantity = newQty;
        await stockRepo.save(ps);
      } else {
        ps = stockRepo.create({ warehouseId: dto.warehouseId, productId: dto.productId, quantity: newQty });
        await stockRepo.save(ps);
      }

      await productRepo.decrement({ id: dto.productId }, 'stock', -dto.quantity);

      const movement = movementRepo.create({
        warehouseId: dto.warehouseId,
        productId: dto.productId,
        quantity: dto.quantity,
        movementType: 0,
        label: dto.label ?? 'Corrección manual',
        inventoryCode: dto.inventoryCode ?? null,
        createdByUserId,
        movedAt: new Date(),
        entity: tenantId ?? 1,
      });
      const saved = await movementRepo.save(movement);

      await qr.commitTransaction();
      return saved;
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  /**
   * Transferencia de stock entre almacenes (movementType=0).
   * fromWarehouseId opcional: si se omite, es una entrada directa al destino.
   */
  async transferStock(dto: TransferStockDto, createdByUserId: number, tenantId: number | null): Promise<StockMovement[]> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    const saved: StockMovement[] = [];

    try {
      const stockRepo = qr.manager.getRepository(ProductStock);
      const movementRepo = qr.manager.getRepository(StockMovement);
      const productRepo = qr.manager.getRepository(Product);

      // Salida del almacén origen (si existe)
      if (dto.fromWarehouseId) {
        const psFrom = await stockRepo.findOne({
          where: { warehouseId: dto.fromWarehouseId, productId: dto.productId },
        });
        const fromQty = psFrom?.quantity ?? 0;
        if (fromQty < dto.quantity) {
          throw new BadRequestException(
            `Stock insuficiente en almacén origen: disponible ${fromQty}, requerido ${dto.quantity}`,
          );
        }
        if (psFrom) {
          psFrom.quantity -= dto.quantity;
          await stockRepo.save(psFrom);
        }
        const exitMov = movementRepo.create({
          warehouseId: dto.fromWarehouseId,
          productId: dto.productId,
          quantity: -dto.quantity,
          movementType: 0,
          label: dto.label ?? `Transferencia a almacén ${dto.toWarehouseId}`,
          createdByUserId,
          movedAt: new Date(),
          entity: tenantId ?? 1,
        });
        saved.push(await movementRepo.save(exitMov));
      }

      // Entrada en almacén destino
      let psDest = await stockRepo.findOne({
        where: { warehouseId: dto.toWarehouseId, productId: dto.productId },
      });
      if (psDest) {
        psDest.quantity += dto.quantity;
        await stockRepo.save(psDest);
      } else {
        psDest = stockRepo.create({
          warehouseId: dto.toWarehouseId,
          productId: dto.productId,
          quantity: dto.quantity,
        });
        await stockRepo.save(psDest);
      }

      const entryMov = movementRepo.create({
        warehouseId: dto.toWarehouseId,
        productId: dto.productId,
        quantity: dto.quantity,
        movementType: 0,
        label: dto.label ?? `Transferencia desde almacén ${dto.fromWarehouseId ?? 'externo'}`,
        createdByUserId,
        movedAt: new Date(),
        entity: tenantId ?? 1,
      });
      saved.push(await movementRepo.save(entryMov));

      // Si es transfer entre almacenes, product.stock no cambia (se conserva el total)
      // Si es entrada sin origen, incrementamos el stock total del producto
      if (!dto.fromWarehouseId) {
        await productRepo.increment({ id: dto.productId }, 'stock', dto.quantity);
      }

      await qr.commitTransaction();
      return saved;
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  /**
   * Calcula el stock de todos los productos en una fecha específica (pasado o futuro).
   * Stock en fecha X = stock_actual + SUM(movimientos con movedAt > X)
   * Para futuro: stock_actual - SUM(movimientos con movedAt < X que aún no pasaron...
   * pero como no hay órdenes futuras reales, se usa la misma lógica inversa.
   */
  async getStockAtDate(dto: StockAtDateDto, tenantId: number | null): Promise<StockAtDateItem[]> {
    const { date, warehouseId, productId } = dto;
    const targetDate = new Date(date);

    const qb = this.dataSource
      .createQueryBuilder()
      .select([
        'ps.productId as productId',
        'p.ref as ref',
        'p.label as label',
        'ps.quantity as currentStock',
        `(ps.quantity + COALESCE(SUM(CASE WHEN sm.movedAt > :targetDate THEN sm.quantity ELSE 0 END), 0)) as stockAtDate`,
      ])
      .from(ProductStock, 'ps')
      .leftJoin(Product, 'p', 'p.id = ps.productId')
      .leftJoin(
        StockMovement,
        'sm',
        'sm.productId = ps.productId AND sm.warehouseId = ps.warehouseId',
      )
      .setParameter('targetDate', targetDate);

    if (warehouseId) qb.andWhere('ps.warehouseId = :warehouseId', { warehouseId });
    if (productId) qb.andWhere('ps.productId = :productId', { productId });
    if (tenantId !== null) qb.andWhere('p.entity = :tenantId', { tenantId });

    qb.groupBy('ps.productId, ps.quantity, p.ref, p.label')
      .orderBy('p.ref', 'ASC');

    const rows = await qb.getRawMany();

    return rows.map((r) => ({
      productId: Number(r.productId),
      ref: r.ref,
      label: r.label,
      stockAtDate: Number(r.stockAtDate),
      currentStock: Number(r.currentStock),
    }));
  }
}
