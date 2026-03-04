import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepo.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException(`Tenant #${id} not found`);
    return tenant;
  }

  async create(dto: CreateTenantDto): Promise<Tenant> {
    const existing = await this.tenantRepo.findOne({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Tenant with code "${dto.code}" already exists`);
    const tenant = this.tenantRepo.create({ ...dto, isActive: dto.isActive ?? true });
    return this.tenantRepo.save(tenant);
  }

  async update(id: number, dto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findOne(id);
    if (dto.code && dto.code !== tenant.code) {
      const existing = await this.tenantRepo.findOne({ where: { code: dto.code } });
      if (existing) throw new ConflictException(`Tenant with code "${dto.code}" already exists`);
    }
    Object.assign(tenant, dto);
    return this.tenantRepo.save(tenant);
  }

  async deactivate(id: number): Promise<Tenant> {
    const tenant = await this.findOne(id);
    tenant.isActive = false;
    return this.tenantRepo.save(tenant);
  }

  async activate(id: number): Promise<Tenant> {
    const tenant = await this.findOne(id);
    tenant.isActive = true;
    return this.tenantRepo.save(tenant);
  }

  async findUsers(tenantId: number): Promise<User[]> {
    await this.findOne(tenantId); // check exists
    return this.userRepo.find({
      where: { entity: tenantId },
      select: ['id', 'username', 'email', 'userType', 'isAdmin', 'entity'],
      order: { username: 'ASC' },
    });
  }
}
