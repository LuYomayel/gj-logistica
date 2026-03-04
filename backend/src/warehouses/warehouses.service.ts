import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from '../entities/warehouse.entity';
import { ProductStock } from '../entities/product-stock.entity';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';

export class UpdateWarehouseDto extends CreateWarehouseDto {}

@Injectable()
export class WarehousesService {
  constructor(
    @InjectRepository(Warehouse) private repo: Repository<Warehouse>,
    @InjectRepository(ProductStock) private stockRepo: Repository<ProductStock>,
  ) {}

  async findAll(tenantId: number | null): Promise<Warehouse[]> {
    return this.repo.find({
      where: {
        status: 1,
        ...(tenantId !== null && { entity: tenantId }),
      },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Warehouse> {
    const wh = await this.repo.findOne({ where: { id } });
    if (!wh) throw new NotFoundException(`Almacén ${id} no encontrado`);
    return wh;
  }

  async create(dto: CreateWarehouseDto, createdByUserId?: number, tenantId?: number | null): Promise<Warehouse> {
    const wh = this.repo.create({ ...dto, status: 1, createdByUserId: createdByUserId ?? null, entity: tenantId ?? 1 });
    return this.repo.save(wh);
  }

  async update(id: number, dto: Partial<UpdateWarehouseDto>): Promise<Warehouse> {
    const wh = await this.findOne(id);
    Object.assign(wh, dto);
    return this.repo.save(wh);
  }

  async getStock(warehouseId: number): Promise<ProductStock[]> {
    await this.findOne(warehouseId);
    return this.stockRepo.find({
      where: { warehouseId },
      relations: { product: true },
      order: { product: { ref: 'ASC' } },
    });
  }
}
