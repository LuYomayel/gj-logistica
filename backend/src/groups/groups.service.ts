import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from '../entities/group.entity';
import { UserGroupMembership } from '../entities/user-group-membership.entity';
import { CreateGroupDto } from './dto/create-group.dto';

export class UpdateGroupDto extends CreateGroupDto {}

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group) private groupRepo: Repository<Group>,
    @InjectRepository(UserGroupMembership)
    private membershipRepo: Repository<UserGroupMembership>,
  ) {}

  async findAll(): Promise<Group[]> {
    return this.groupRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number): Promise<Group> {
    const group = await this.groupRepo.findOne({ where: { id } });
    if (!group) throw new NotFoundException(`Grupo ${id} no encontrado`);
    return group;
  }

  async create(dto: CreateGroupDto): Promise<Group> {
    const existing = await this.groupRepo.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException(`El grupo '${dto.name}' ya existe`);
    const group = this.groupRepo.create({ ...dto });
    return this.groupRepo.save(group);
  }

  async update(id: number, dto: Partial<UpdateGroupDto>): Promise<Group> {
    const group = await this.findOne(id);
    Object.assign(group, dto);
    return this.groupRepo.save(group);
  }

  async getMembers(groupId: number) {
    await this.findOne(groupId);
    return this.membershipRepo.find({
      where: { groupId },
      relations: { user: true },
    });
  }

  async addMember(groupId: number, userId: number): Promise<UserGroupMembership> {
    await this.findOne(groupId);
    const existing = await this.membershipRepo.findOne({ where: { groupId, userId } });
    if (existing) throw new ConflictException('El usuario ya pertenece a este grupo');
    const membership = this.membershipRepo.create({ groupId, userId });
    return this.membershipRepo.save(membership);
  }

  async removeMember(groupId: number, userId: number): Promise<void> {
    await this.findOne(groupId);
    const membership = await this.membershipRepo.findOne({ where: { groupId, userId } });
    if (!membership) throw new NotFoundException('El usuario no pertenece a este grupo');
    await this.membershipRepo.remove(membership);
  }
}
