import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Warehouse } from '../entities/warehouse.entity';
import { ProductStock } from '../entities/product-stock.entity';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';

export class UpdateWarehouseDto extends CreateWarehouseDto {}

type UserType = 'super_admin' | 'client_admin' | 'client_user';

@Injectable()
export class WarehousesService {
  constructor(
    @InjectRepository(Warehouse) private repo: Repository<Warehouse>,
    @InjectRepository(ProductStock) private stockRepo: Repository<ProductStock>,
  ) {}

  async findAll(
    tenantId: number | null,
    filterTenantId?: number,
  ): Promise<Warehouse[]> {
    const where: FindOptionsWhere<Warehouse> = { status: 1 };
    if (tenantId !== null) {
      where.entity = tenantId;
    } else if (filterTenantId) {
      // super_admin puede filtrar por tenant opcionalmente
      where.entity = filterTenantId;
    }
    return this.repo.find({ where, relations: { tenant: true }, order: { name: 'ASC' } });
  }

  async findOne(id: number, tenantId?: number | null): Promise<Warehouse> {
    const where: FindOptionsWhere<Warehouse> = { id };
    if (tenantId !== null && tenantId !== undefined) where.entity = tenantId;
    const wh = await this.repo.findOne({ where, relations: { tenant: true } });
    if (!wh) throw new NotFoundException(`Almacén ${id} no encontrado`);
    return wh;
  }

  async create(
    dto: CreateWarehouseDto,
    createdByUserId: number | null,
    userTenantId: number | null,
    userType: UserType,
  ): Promise<Warehouse> {
    const { tenantId: dtoTenantId, ...rest } = dto;

    let entity: number;
    if (userType === 'super_admin') {
      if (!dtoTenantId) {
        throw new BadRequestException(
          'Como super_admin debe indicar la organización (tenantId) del almacén',
        );
      }
      entity = dtoTenantId;
    } else {
      if (userTenantId == null) {
        throw new BadRequestException('El usuario no tiene una organización asignada');
      }
      entity = userTenantId;
    }

    const wh = this.repo.create({
      ...rest,
      status: rest.status ?? 1,
      createdByUserId: createdByUserId ?? null,
      entity,
    });
    return this.repo.save(wh);
  }

  async update(
    id: number,
    dto: Partial<UpdateWarehouseDto>,
    userTenantId: number | null,
    userType: UserType,
  ): Promise<Warehouse> {
    await this.findOne(id, userTenantId);
    const { tenantId: dtoTenantId, ...rest } = dto;

    if (dtoTenantId !== undefined && userType !== 'super_admin') {
      throw new ForbiddenException('No tenés permiso para cambiar la organización de un almacén');
    }

    const patch: Record<string, unknown> = { ...rest };
    if (dtoTenantId !== undefined) patch.entity = dtoTenantId;

    await this.repo.update(id, patch);
    return this.findOne(id, null);
  }

  async getStock(warehouseId: number, tenantId?: number | null): Promise<ProductStock[]> {
    await this.findOne(warehouseId, tenantId);
    return this.stockRepo.find({
      where: { warehouseId },
      relations: { product: true },
      order: { product: { ref: 'ASC' } },
    });
  }
}
