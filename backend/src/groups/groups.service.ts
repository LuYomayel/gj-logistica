import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Group } from '../entities/group.entity';
import { UserGroupMembership } from '../entities/user-group-membership.entity';
import { User } from '../entities/user.entity';
import { CreateGroupDto } from './dto/create-group.dto';

export class UpdateGroupDto extends CreateGroupDto {}

type UserType = 'super_admin' | 'client_admin' | 'client_user';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group) private groupRepo: Repository<Group>,
    @InjectRepository(UserGroupMembership)
    private membershipRepo: Repository<UserGroupMembership>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async findAll(tenantId: number | null): Promise<Group[]> {
    const where: FindOptionsWhere<Group> = {};
    if (tenantId !== null) where.entity = tenantId;
    return this.groupRepo.find({ where, order: { name: 'ASC' } });
  }

  async findOne(id: number, tenantId: number | null): Promise<Group> {
    const where: FindOptionsWhere<Group> = { id };
    if (tenantId !== null) where.entity = tenantId;
    const group = await this.groupRepo.findOne({ where });
    if (!group) throw new NotFoundException(`Grupo ${id} no encontrado`);
    return group;
  }

  async create(
    dto: CreateGroupDto,
    userTenantId: number | null,
    userType: UserType,
    dtoTenantId?: number,
  ): Promise<Group> {
    let entity: number;
    if (userType === 'super_admin') {
      if (!dtoTenantId) throw new BadRequestException('Como super_admin debe indicar la organización (tenantId)');
      entity = dtoTenantId;
    } else {
      if (userTenantId == null) throw new BadRequestException('El usuario no tiene una organización asignada');
      entity = userTenantId;
    }

    const existing = await this.groupRepo.findOne({ where: { name: dto.name, entity } });
    if (existing) throw new ConflictException(`El grupo '${dto.name}' ya existe`);
    const group = this.groupRepo.create({ ...dto, entity });
    return this.groupRepo.save(group);
  }

  async update(id: number, dto: Partial<UpdateGroupDto>, tenantId: number | null): Promise<Group> {
    const group = await this.findOne(id, tenantId);
    Object.assign(group, dto);
    return this.groupRepo.save(group);
  }

  async getMembers(groupId: number, tenantId: number | null) {
    await this.findOne(groupId, tenantId);
    return this.membershipRepo.find({
      where: { groupId },
      relations: { user: true },
    });
  }

  private async assertUserInTenant(userId: number, tenantId: number | null): Promise<void> {
    if (tenantId === null) return;
    const u = await this.userRepo.findOne({ where: { id: userId, entity: tenantId } });
    if (!u) throw new NotFoundException(`Usuario ${userId} no encontrado en esta organización`);
  }

  async addMember(groupId: number, userId: number, tenantId: number | null): Promise<UserGroupMembership> {
    await this.findOne(groupId, tenantId);
    await this.assertUserInTenant(userId, tenantId);
    const existing = await this.membershipRepo.findOne({ where: { groupId, userId } });
    if (existing) throw new ConflictException('El usuario ya pertenece a este grupo');
    const membership = this.membershipRepo.create({ groupId, userId });
    return this.membershipRepo.save(membership);
  }

  async removeMember(groupId: number, userId: number, tenantId: number | null): Promise<void> {
    await this.findOne(groupId, tenantId);
    const membership = await this.membershipRepo.findOne({ where: { groupId, userId } });
    if (!membership) throw new NotFoundException('El usuario no pertenece a este grupo');
    await this.membershipRepo.remove(membership);
  }
}
