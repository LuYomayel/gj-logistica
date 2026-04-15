import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service';
import { User } from '../entities/user.entity';
import { UserGroupMembership } from '../entities/user-group-membership.entity';

const mockUser: Partial<User> = {
  id: 1,
  username: 'jperez',
  passwordHash: 'hashed',
  firstName: 'Juan',
  lastName: 'Perez',
  email: 'juan@test.com',
  status: 1,
  isAdmin: false,
  userType: 'client_user' as const,
  entity: 1,
};

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: jest.Mocked<Repository<User>>;
  let membershipRepo: jest.Mocked<Repository<UserGroupMembership>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserGroupMembership),
          useValue: { find: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepo = module.get(getRepositoryToken(User));
    membershipRepo = module.get(getRepositoryToken(UserGroupMembership));
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      userRepo.find.mockResolvedValue([mockUser as User]);
      const result = await service.findAll(null);
      expect(result).toHaveLength(1);
      expect(result[0].username).toBe('jperez');
    });
  });

  describe('findOne', () => {
    it('should return user when found', async () => {
      userRepo.findOne.mockResolvedValue(mockUser as User);
      const result = await service.findOne(1);
      expect(result.id).toBe(1);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a new user with hashed password', async () => {
      userRepo.findOne.mockResolvedValue(null); // no conflict
      const savedUser = { ...mockUser, id: 2 } as User;
      userRepo.create.mockReturnValue(savedUser);
      userRepo.save.mockResolvedValue(savedUser);

      const result = await service.create({
        username: 'newuser',
        password: 'pass123',
        firstName: 'Nuevo',
        lastName: 'Usuario',
      }, 1, 'client_admin');

      expect(result).toBeDefined();
      expect(userRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if username already exists', async () => {
      userRepo.findOne.mockResolvedValue(mockUser as User);
      await expect(
        service.create({ username: 'jperez', password: 'pass123' }, null),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deactivate', () => {
    it('should set user status to 0', async () => {
      const user = { ...mockUser, status: 1 } as User;
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue({ ...user, status: 0 });

      const result = await service.deactivate(1, null);
      expect(result.status).toBe(0);
      expect(userRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 0 }));
    });
  });

  describe('getUserGroups', () => {
    it('should return memberships for a user', async () => {
      userRepo.findOne.mockResolvedValue(mockUser as User);
      membershipRepo.find.mockResolvedValue([]);
      const result = await service.getUserGroups(1, null);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
