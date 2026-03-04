import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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

  async findAll(filter: FilterInventoryDto, tenantId: number | null): Promise<PaginatedInventories> {
    const { warehouseId, status, page = 1, limit = 20 } = filter;

    const qb = this.inventoryRepo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.warehouse', 'w');

    if (warehouseId !== undefined) qb.andWhere('i.warehouseId = :warehouseId', { warehouseId });
    if (status !== undefined) qb.andWhere('i.status = :status', { status });
    if (tenantId !== null) qb.andWhere('i.entity = :tenantId', { tenantId });

    qb.orderBy('i.createdAt', 'DESC').skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async findOne(id: number): Promise<Inventory & { lines: InventoryLine[] }> {
    const inventory = await this.inventoryRepo.findOne({ where: { id }, relations: ['warehouse'] });
    if (!inventory) throw new NotFoundException(`Inventario ${id} no encontrado`);

    const lines = await this.lineRepo.find({ where: { inventoryId: id } });

    // Enrich lines with current expected stock
    const enrichedLines = await Promise.all(
      lines.map(async (line) => {
        if (line.warehouseId && line.productId) {
          const ps = await this.stockRepo.findOne({
            where: { warehouseId: line.warehouseId, productId: line.productId },
          });
          // Expected is the current stock (if not already set)
          if (line.expectedQuantity === null || line.expectedQuantity === undefined) {
            line.expectedQuantity = ps?.quantity ?? 0;
          }
        }
        return line;
      }),
    );

    return { ...inventory, lines: enrichedLines } as Inventory & { lines: InventoryLine[] };
  }

  async create(dto: CreateInventoryDto, createdByUserId: number, tenantId: number | null): Promise<Inventory> {
    const inventory = this.inventoryRepo.create({
      ref: dto.ref,
      label: dto.label ?? null,
      warehouseId: dto.warehouseId ?? null,
      productId: dto.productId ?? null,
      inventoryDate: dto.inventoryDate ? new Date(dto.inventoryDate) : null,
      status: 0,
      createdByUserId,
      entity: tenantId ?? 1,
    });
    return this.inventoryRepo.save(inventory);
  }

  async addLine(
    inventoryId: number,
    dto: AddInventoryLineDto,
    createdByUserId: number,
  ): Promise<InventoryLine> {
    const inventory = await this.inventoryRepo.findOne({ where: { id: inventoryId } });
    if (!inventory) throw new NotFoundException(`Inventario ${inventoryId} no encontrado`);
    if (inventory.status !== 0) {
      throw new BadRequestException('Solo se pueden agregar líneas a inventarios en borrador');
    }

    // Get current stock as expectedQuantity
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
  ): Promise<InventoryLine> {
    const inventory = await this.inventoryRepo.findOne({ where: { id: inventoryId } });
    if (!inventory) throw new NotFoundException(`Inventario ${inventoryId} no encontrado`);
    if (inventory.status !== 0) {
      throw new BadRequestException('No se puede modificar un inventario ya validado');
    }

    const line = await this.lineRepo.findOne({ where: { id: lineId, inventoryId } });
    if (!line) throw new NotFoundException(`Línea ${lineId} no encontrada`);

    line.realQuantity = dto.realQuantity;
    return this.lineRepo.save(line);
  }

  async removeLine(inventoryId: number, lineId: number): Promise<void> {
    const inventory = await this.inventoryRepo.findOne({ where: { id: inventoryId } });
    if (!inventory) throw new NotFoundException(`Inventario ${inventoryId} no encontrado`);
    if (inventory.status !== 0) {
      throw new BadRequestException('No se puede modificar un inventario ya validado');
    }

    const line = await this.lineRepo.findOne({ where: { id: lineId, inventoryId } });
    if (!line) throw new NotFoundException(`Línea ${lineId} no encontrada`);

    await this.lineRepo.remove(line);
  }

  /**
   * Valida el inventario: genera movimientos de stock para cada diferencia
   * (realQuantity - expectedQuantity) y cierra el inventario.
   * Todo en una sola transacción atómica.
   */
  async validate(inventoryId: number, userId: number): Promise<Inventory> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const invRepo = qr.manager.getRepository(Inventory);
      const lineRepo = qr.manager.getRepository(InventoryLine);
      const stockRepo = qr.manager.getRepository(ProductStock);
      const movRepo = qr.manager.getRepository(StockMovement);
      const productRepo = qr.manager.getRepository(Product);

      const inventory = await invRepo.findOne({ where: { id: inventoryId } });
      if (!inventory) throw new NotFoundException(`Inventario ${inventoryId} no encontrado`);
      if (inventory.status !== 0) {
        throw new BadRequestException('El inventario ya fue validado');
      }

      const lines = await lineRepo.find({ where: { inventoryId } });

      for (const line of lines) {
        if (line.productId === null || line.warehouseId === null) continue;
        if (line.realQuantity === null) continue;

        // Get current stock to compute expected
        const ps = await stockRepo.findOne({
          where: { warehouseId: line.warehouseId, productId: line.productId },
        });
        const expected = ps?.quantity ?? 0;
        const delta = (line.realQuantity ?? 0) - expected;

        if (delta === 0) continue;

        // Update product_stocks
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

        // Update product.stock mirror
        if (delta !== 0) {
          await productRepo.increment({ id: line.productId }, 'stock', delta);
        }

        // Create stock movement (type=3: inventario)
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

        // Update expected quantity in line record
        line.expectedQuantity = expected;
        await lineRepo.save(line);
      }

      // Mark inventory as validated
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

  async resetToDraft(inventoryId: number): Promise<Inventory> {
    const inventory = await this.inventoryRepo.findOne({ where: { id: inventoryId } });
    if (!inventory) throw new NotFoundException(`Inventario ${inventoryId} no encontrado`);
    if (inventory.status !== 1) {
      throw new BadRequestException('Solo se pueden resetear inventarios validados');
    }
    await this.inventoryRepo.update(inventoryId, { status: 0 });
    return this.inventoryRepo.findOne({ where: { id: inventoryId } }) as Promise<Inventory>;
  }

  async remove(inventoryId: number): Promise<void> {
    const inventory = await this.inventoryRepo.findOne({ where: { id: inventoryId } });
    if (!inventory) throw new NotFoundException(`Inventario ${inventoryId} no encontrado`);
    if (inventory.status !== 0) {
      throw new BadRequestException('Solo se pueden eliminar inventarios en borrador');
    }
    await this.inventoryRepo.remove(inventory);
  }
}
