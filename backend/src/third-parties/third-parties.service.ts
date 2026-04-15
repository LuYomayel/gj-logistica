import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ThirdParty } from '../entities/third-party.entity';
import { SalesRepresentative } from '../entities/sales-representative.entity';
import { CreateThirdPartyDto } from './dto/create-third-party.dto';

export class UpdateThirdPartyDto extends CreateThirdPartyDto {}

@Injectable()
export class ThirdPartiesService {
  constructor(
    @InjectRepository(ThirdParty) private repo: Repository<ThirdParty>,
    @InjectRepository(SalesRepresentative)
    private salesRepRepo: Repository<SalesRepresentative>,
  ) {}

  async findAll(tenantId: number | null): Promise<ThirdParty[]> {
    return this.repo.find({
      where: {
        status: 1,
        ...(tenantId !== null && { entity: tenantId }),
      },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number, tenantId?: number | null): Promise<ThirdParty> {
    const where: FindOptionsWhere<ThirdParty> = { id };
    if (tenantId !== null && tenantId !== undefined) where.entity = tenantId;
    const tp = await this.repo.findOne({ where });
    if (!tp) throw new NotFoundException(`Empresa ${id} no encontrada`);
    return tp;
  }

  async create(dto: CreateThirdPartyDto, tenantId: number | null): Promise<ThirdParty> {
    const tp = this.repo.create({ ...dto, status: 1, isClient: 1, entity: tenantId ?? 1 });
    return this.repo.save(tp);
  }

  async update(id: number, dto: Partial<UpdateThirdPartyDto>, tenantId: number | null): Promise<ThirdParty> {
    const tp = await this.findOne(id, tenantId);
    Object.assign(tp, dto);
    return this.repo.save(tp);
  }

  async getSalesReps(thirdPartyId: number, tenantId: number | null) {
    await this.findOne(thirdPartyId, tenantId);
    return this.salesRepRepo.find({
      where: { thirdPartyId },
      relations: { user: true },
    });
  }

  async addSalesRep(thirdPartyId: number, userId: number, tenantId: number | null): Promise<SalesRepresentative> {
    await this.findOne(thirdPartyId, tenantId);
    const existing = await this.salesRepRepo.findOne({ where: { thirdPartyId, userId } });
    if (existing) return existing;
    const rep = this.salesRepRepo.create({ thirdPartyId, userId });
    return this.salesRepRepo.save(rep);
  }

  async removeSalesRep(thirdPartyId: number, userId: number, tenantId: number | null): Promise<void> {
    await this.findOne(thirdPartyId, tenantId);
    const rep = await this.salesRepRepo.findOne({ where: { thirdPartyId, userId } });
    if (!rep) throw new NotFoundException('Representante no encontrado');
    await this.salesRepRepo.remove(rep);
  }
}
