import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository, DataSource } from 'typeorm';
import { Inventory } from '../entities/inventory.entity';
import { InventoryLine } from '../entities/inventory-line.entity';
import { ProductStock } from '../entities/product-stock.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { Product } from '../entities/product.entity';
import {
  CreateInventoryDto, AddInventoryLineDto, UpdateInventoryLineDto, FilterInventoryDto,
} from './dto/create-inventory.dto';

export interface PaginatedInventories {
  items: Inventory[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class InventoriesService {
  constructor(
    @InjectRepository(Inventory) private inventoryRepo: Repository<Inventory>,
    @InjectRepository(InventoryLine) private lineRepo: Repository<InventoryLine>,
    @InjectRepository(ProductStock) private stockRepo: Repository<ProductStock>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    private dataSource: DataSource,
  ) {}

  private async loadInventoryScoped(
    repo: Repository<Inventory>,
    id: number,
    tenantId: number | null,
  ): Promise<Inventory> {
    const where: FindOptionsWhere<Inventory> = { id };
    if (tenantId !== null) where.entity = tenantId;
    const inv = await repo.findOne({ where });
    if (!inv) throw new NotFoundException(`Inventario ${id} no encontrado`);
    return inv;
  }

  async findAll(filter: FilterInventoryDto, tenantId: number | null): Promise<PaginatedInventories> {
    const { warehouseId, status, page = 1, limit = 20, tenantId: filterTenantId } = filter;

    const qb = this.inventoryRepo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.warehouse', 'w');

    if (warehouseId !== undefined) qb.andWhere('i.warehouseId = :warehouseId', { warehouseId });
    if (status !== undefined) qb.andWhere('i.status = :status', { status });
    if (tenantId !== null) {
      qb.andWhere('i.entity = :tenantId', { tenantId });
    } else if (filterTenantId !== undefined) {
      qb.andWhere('i.entity = :filterTenantId', { filterTenantId });
    }

    qb.orderBy('i.createdAt', 'DESC').skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async findOne(id: number, tenantId: number | null): Promise<Inventory & { lines: InventoryLine[] }> {
    const inventory = await this.loadInventoryScoped(this.inventoryRepo, id, tenantId);
    const full = await this.inventoryRepo.findOne({ where: { id }, relations: ['warehouse'] });
    const lines = await this.lineRepo.find({ where: { inventoryId: id } });

    const enrichedLines = await Promise.all(
      lines.map(async (line) => {
        if (line.warehouseId && line.productId) {
          const ps = await this.stockRepo.findOne({
            where: { warehouseId: line.warehouseId, productId: line.productId },
          });
          if (line.expectedQuantity === null || line.expectedQuantity === undefined) {
            line.expectedQuantity = ps?.quantity ?? 0;
          }
        }
        return line;
      }),
    );

    return { ...(full ?? inventory), lines: enrichedLines } as Inventory & { lines: InventoryLine[] };
  }

  async create(
    dto: CreateInventoryDto,
    createdByUserId: number,
    userTenantId: number | null,
    userType: 'super_admin' | 'client_admin' | 'client_user',
  ): Promise<Inventory> {
    const { tenantId: dtoTenantId, ...rest } = dto;

    let entity: number;
    if (userType === 'super_admin') {
      if (!dtoTenantId) {
        throw new BadRequestException(
          'Como super_admin debe indicar la organización (tenantId) del inventario',
        );
      }
      entity = dtoTenantId;
    } else {
      if (userTenantId == null) {
        throw new BadRequestException('El usuario no tiene una organización asignada');
      }
      entity = userTenantId;
    }

    const inventory = this.inventoryRepo.create({
      ref: rest.ref,
      label: rest.label ?? null,
      warehouseId: rest.warehouseId ?? null,
      productId: rest.productId ?? null,
      inventoryDate: rest.inventoryDate ? new Date(rest.inventoryDate) : null,
      status: 0,
      createdByUserId,
      entity,
    });
    return this.inventoryRepo.save(inventory);
  }

  async addLine(
    inventoryId: number,
    dto: AddInventoryLineDto,
    createdByUserId: number,
    tenantId: number | null,
  ): Promise<InventoryLine> {
    const inventory = await this.loadInventoryScoped(this.inventoryRepo, inventoryId, tenantId);
    if (inventory.status !== 0) {
      throw new BadRequestException('Solo se pueden agregar líneas a inventarios en borrador');
    }

    const ps = await this.stockRepo.findOne({
      where: { warehouseId: dto.warehouseId, productId: dto.productId },
    });

    const line = this.lineRepo.create({
      inventoryId,
      warehouseId: dto.warehouseId,
      productId: dto.productId,
      expectedQuantity: ps?.quantity ?? 0,
      realQuantity: dto.realQuantity,
      createdByUserId,
    });
    return this.lineRepo.save(line);
  }

  async updateLine(
    inventoryId: number,
    lineId: number,
    dto: UpdateInventoryLineDto,
    tenantId: number | null,
  ): Promise<InventoryLine> {
    const inventory = await this.loadInventoryScoped(this.inventoryRepo, inventoryId, tenantId);
    if (inventory.status !== 0) {
      throw new BadRequestException('No se puede modificar un inventario ya validado');
    }

    const line = await this.lineRepo.findOne({ where: { id: lineId, inventoryId } });
    if (!line) throw new NotFoundException(`Línea ${lineId} no encontrada`);

    line.realQuantity = dto.realQuantity;
    return this.lineRepo.save(line);
  }

  async removeLine(inventoryId: number, lineId: number, tenantId: number | null): Promise<void> {
    const inventory = await this.loadInventoryScoped(this.inventoryRepo, inventoryId, tenantId);
    if (inventory.status !== 0) {
      throw new BadRequestException('No se puede modificar un inventario ya validado');
    }

    const line = await this.lineRepo.findOne({ where: { id: lineId, inventoryId } });
    if (!line) throw new NotFoundException(`Línea ${lineId} no encontrada`);

    await this.lineRepo.remove(line);
  }

  async validate(inventoryId: number, userId: number, tenantId: number | null): Promise<Inventory> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const invRepo = qr.manager.getRepository(Inventory);
      const lineRepo = qr.manager.getRepository(InventoryLine);
      const stockRepo = qr.manager.getRepository(ProductStock);
      const movRepo = qr.manager.getRepository(StockMovement);
      const productRepo = qr.manager.getRepository(Product);

      const inventory = await this.loadInventoryScoped(invRepo, inventoryId, tenantId);
      if (inventory.status !== 0) {
        throw new BadRequestException('El inventario ya fue validado');
      }

      const lines = await lineRepo.find({ where: { inventoryId } });

      for (const line of lines) {
        if (line.productId === null || line.warehouseId === null) continue;
        if (line.realQuantity === null) continue;

        const ps = await stockRepo.findOne({
          where: { warehouseId: line.warehouseId, productId: line.productId },
        });
        const expected = ps?.quantity ?? 0;
        const delta = (line.realQuantity ?? 0) - expected;

        if (delta === 0) continue;

        if (ps) {
          ps.quantity = line.realQuantity!;
          await stockRepo.save(ps);
        } else {
          await stockRepo.save(
            stockRepo.create({
              warehouseId: line.warehouseId,
              productId: line.productId,
              quantity: line.realQuantity!,
            }),
          );
        }

        if (delta !== 0) {
          await productRepo.increment({ id: line.productId }, 'stock', delta);
        }

        await movRepo.save(
          movRepo.create({
            warehouseId: line.warehouseId,
            productId: line.productId,
            quantity: delta,
            movementType: 3,
            originType: 'inventory',
            originId: inventoryId,
            inventoryCode: inventory.ref,
            label: `Inventario ${inventory.ref}`,
            createdByUserId: userId,
            movedAt: new Date(),
          }),
        );

        line.expectedQuantity = expected;
        await lineRepo.save(line);
      }

      await invRepo.update(inventoryId, { status: 1 });

      await qr.commitTransaction();

      return invRepo.findOne({ where: { id: inventoryId } }) as Promise<Inventory>;
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  async resetToDraft(inventoryId: number, tenantId: number | null, userId?: number): Promise<Inventory> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const invRepo = qr.manager.getRepository(Inventory);
      const stockRepo = qr.manager.getRepository(ProductStock);
      const movRepo = qr.manager.getRepository(StockMovement);
      const productRepo = qr.manager.getRepository(Product);

      const inventory = await this.loadInventoryScoped(invRepo, inventoryId, tenantId);
      if (inventory.status !== 1) {
        throw new BadRequestException('Solo se pueden resetear inventarios validados');
      }

      const movements = await movRepo.find({
        where: { originType: 'inventory', originId: inventoryId },
      });

      for (const mov of movements) {
        if (mov.productId === null || mov.warehouseId === null) continue;

        const reverseDelta = -(mov.quantity ?? 0);
        if (reverseDelta === 0) continue;

        const ps = await stockRepo.findOne({
          where: { warehouseId: mov.warehouseId, productId: mov.productId },
        });
        if (ps) {
          ps.quantity = (ps.quantity ?? 0) + reverseDelta;
          await stockRepo.save(ps);
        }

        await productRepo.increment({ id: mov.productId }, 'stock', reverseDelta);

        await movRepo.save(
          movRepo.create({
            warehouseId: mov.warehouseId,
            productId: mov.productId,
            quantity: reverseDelta,
            movementType: 3,
            originType: 'inventory',
            originId: inventoryId,
            inventoryCode: inventory.ref,
            label: `Reversión inventario ${inventory.ref}`,
            createdByUserId: userId ?? null,
            movedAt: new Date(),
          }),
        );
      }

      await invRepo.update(inventoryId, { status: 0 });

      await qr.commitTransaction();

      return invRepo.findOne({ where: { id: inventoryId } }) as Promise<Inventory>;
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  async remove(inventoryId: number, tenantId: number | null): Promise<void> {
    const inventory = await this.loadInventoryScoped(this.inventoryRepo, inventoryId, tenantId);
    if (inventory.status !== 0) {
      throw new BadRequestException('Solo se pueden eliminar inventarios en borrador');
    }
    await this.inventoryRepo.remove(inventory);
  }
}
