import {
  Injectable, NotFoundException, ConflictException,
  BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { UserGroupMembership } from '../entities/user-group-membership.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(UserGroupMembership)
    private membershipRepo: Repository<UserGroupMembership>,
  ) {}

  async findAll(tenantId: number | null): Promise<User[]> {
    // super_admin (tenantId=null) sees all users; others see only their tenant
    if (tenantId === null) {
      return this.userRepo.find({ order: { lastName: 'ASC' } });
    }
    return this.userRepo.find({
      where: { entity: tenantId },
      order: { lastName: 'ASC' },
    });
  }

  async findOne(id: number, tenantId?: number | null): Promise<User> {
    const where: { id: number; entity?: number } = { id };
    if (tenantId !== null && tenantId !== undefined) where.entity = tenantId;
    const user = await this.userRepo.findOne({ where });
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return user;
  }

  async create(dto: CreateUserDto, tenantId: number | null): Promise<User> {
    const existing = await this.userRepo.findOne({ where: { username: dto.username } });
    if (existing) throw new ConflictException(`El usuario '${dto.username}' ya existe`);

    const passwordHash = await bcrypt.hash(dto.password, 12);
    // super_admin can specify entity/userType explicitly in the DTO
    const effectiveEntity = dto.entity ?? tenantId ?? 1;
    const user = this.userRepo.create({
      username: dto.username,
      passwordHash,
      firstName: dto.firstName ?? null,
      lastName: dto.lastName ?? null,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      isAdmin: dto.isAdmin ?? false,
      userType: dto.userType ?? 'client_user',
      supervisorId: dto.supervisorId ?? null,
      status: 1,
      entity: effectiveEntity,
    });
    return this.userRepo.save(user);
  }

  async update(
    id: number,
    dto: UpdateUserDto,
    requester?: { id: number; userType: string; tenantId?: number | null },
  ): Promise<User> {
    const user = await this.findOne(id, requester?.tenantId ?? null);

    // Prevent privilege escalation: only super_admin can change these fields
    if (!requester || requester.userType !== 'super_admin') {
      if (dto.userType === 'super_admin') {
        throw new ForbiddenException('Solo un super_admin puede asignar el rol super_admin');
      }
      delete dto.userType;
      delete dto.isAdmin;
      delete dto.entity;
    }

    const updates: Partial<User> = { ...dto };

    if (dto.password) {
      (updates as Record<string, unknown>)['passwordHash'] = await bcrypt.hash(dto.password, 12);
      delete (updates as Record<string, unknown>)['password'];
    }

    Object.assign(user, updates);
    return this.userRepo.save(user);
  }

  async deactivate(id: number, tenantId: number | null): Promise<User> {
    const user = await this.findOne(id, tenantId);
    user.status = 0;
    return this.userRepo.save(user);
  }

  async activate(id: number, tenantId: number | null): Promise<User> {
    const user = await this.findOne(id, tenantId);
    user.status = 1;
    return this.userRepo.save(user);
  }

  async changePassword(
    id: number,
    dto: ChangePasswordDto,
    requester: { id: number; permissions: string[]; tenantId?: number | null },
  ): Promise<void> {
    const user = await this.findOne(id, requester.tenantId ?? null);
    const isSelf = requester.id === id;
    const hasAdminPerm =
      requester.permissions.includes('*') ||
      requester.permissions.includes('users.write_password');

    if (!isSelf && !hasAdminPerm) {
      throw new ForbiddenException(
        'No tienes permisos para cambiar la contraseña de otro usuario',
      );
    }

    if (isSelf) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Se requiere la contraseña actual');
      }
      const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!valid) {
        throw new BadRequestException('La contraseña actual es incorrecta');
      }
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.userRepo.save(user);
  }

  async getUserGroups(userId: number, tenantId: number | null) {
    await this.findOne(userId, tenantId);
    return this.membershipRepo.find({
      where: { userId },
      relations: { group: true },
    });
  }
}
