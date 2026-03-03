import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { UserGroupMembership } from '../entities/user-group-membership.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(UserGroupMembership)
    private membershipRepo: Repository<UserGroupMembership>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepo.find({ order: { lastName: 'ASC' } });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepo.findOne({ where: { username: dto.username } });
    if (existing) throw new ConflictException(`El usuario '${dto.username}' ya existe`);

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      username: dto.username,
      passwordHash,
      firstName: dto.firstName ?? null,
      lastName: dto.lastName ?? null,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      isAdmin: dto.isAdmin ?? false,
      supervisorId: dto.supervisorId ?? null,
      status: 1,
    });
    return this.userRepo.save(user);
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    const updates: Partial<User> = { ...dto };

    if (dto.password) {
      (updates as Record<string, unknown>)['passwordHash'] = await bcrypt.hash(dto.password, 12);
      delete (updates as Record<string, unknown>)['password'];
    }

    Object.assign(user, updates);
    return this.userRepo.save(user);
  }

  async deactivate(id: number): Promise<User> {
    const user = await this.findOne(id);
    user.status = 0;
    return this.userRepo.save(user);
  }

  async getUserGroups(userId: number) {
    await this.findOne(userId);
    return this.membershipRepo.find({
      where: { userId },
      relations: { group: true },
    });
  }
}
