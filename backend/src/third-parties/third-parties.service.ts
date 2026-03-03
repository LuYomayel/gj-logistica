import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async findAll(): Promise<ThirdParty[]> {
    return this.repo.find({ where: { status: 1 }, order: { name: 'ASC' } });
  }

  async findOne(id: number): Promise<ThirdParty> {
    const tp = await this.repo.findOne({ where: { id } });
    if (!tp) throw new NotFoundException(`Empresa ${id} no encontrada`);
    return tp;
  }

  async create(dto: CreateThirdPartyDto): Promise<ThirdParty> {
    const tp = this.repo.create({ ...dto, status: 1, isClient: 1 });
    return this.repo.save(tp);
  }

  async update(id: number, dto: Partial<UpdateThirdPartyDto>): Promise<ThirdParty> {
    const tp = await this.findOne(id);
    Object.assign(tp, dto);
    return this.repo.save(tp);
  }

  async getSalesReps(thirdPartyId: number) {
    await this.findOne(thirdPartyId);
    return this.salesRepRepo.find({
      where: { thirdPartyId },
      relations: { user: true },
    });
  }

  async addSalesRep(thirdPartyId: number, userId: number): Promise<SalesRepresentative> {
    await this.findOne(thirdPartyId);
    const existing = await this.salesRepRepo.findOne({ where: { thirdPartyId, userId } });
    if (existing) return existing;
    const rep = this.salesRepRepo.create({ thirdPartyId, userId });
    return this.salesRepRepo.save(rep);
  }

  async removeSalesRep(thirdPartyId: number, userId: number): Promise<void> {
    await this.findOne(thirdPartyId);
    const rep = await this.salesRepRepo.findOne({ where: { thirdPartyId, userId } });
    if (!rep) throw new NotFoundException('Representante no encontrado');
    await this.salesRepRepo.remove(rep);
  }
}
