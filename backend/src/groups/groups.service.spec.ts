import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { Group } from '../entities/group.entity';
import { UserGroupMembership } from '../entities/user-group-membership.entity';

const mockGroup: Partial<Group> = {
  id: 1,
  name: 'Comercial',
  description: 'Equipo comercial',
  entity: 1,
};

describe('GroupsService', () => {
  let service: GroupsService;
  let groupRepo: jest.Mocked<Repository<Group>>;
  let membershipRepo: jest.Mocked<Repository<UserGroupMembership>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        {
          provide: getRepositoryToken(Group),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserGroupMembership),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
    groupRepo = module.get(getRepositoryToken(Group));
    membershipRepo = module.get(getRepositoryToken(UserGroupMembership));
  });

  describe('findAll', () => {
    it('should return array of groups', async () => {
      groupRepo.find.mockResolvedValue([mockGroup as Group]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Comercial');
    });
  });

  describe('findOne', () => {
    it('should return group when found', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup as Group);
      const result = await service.findOne(1);
      expect(result.name).toBe('Comercial');
    });

    it('should throw NotFoundException when not found', async () => {
      groupRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a group', async () => {
      groupRepo.findOne.mockResolvedValue(null);
      groupRepo.create.mockReturnValue(mockGroup as Group);
      groupRepo.save.mockResolvedValue(mockGroup as Group);

      const result = await service.create({ name: 'Comercial' });
      expect(result.name).toBe('Comercial');
    });

    it('should throw ConflictException if name exists', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup as Group);
      await expect(service.create({ name: 'Comercial' })).rejects.toThrow(ConflictException);
    });
  });

  describe('addMember', () => {
    it('should add a member to group', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup as Group);
      membershipRepo.findOne.mockResolvedValue(null);
      const membership = { groupId: 1, userId: 5 } as UserGroupMembership;
      membershipRepo.create.mockReturnValue(membership);
      membershipRepo.save.mockResolvedValue(membership);

      const result = await service.addMember(1, 5);
      expect(result.userId).toBe(5);
    });

    it('should throw ConflictException if already a member', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup as Group);
      membershipRepo.findOne.mockResolvedValue({ groupId: 1, userId: 5 } as UserGroupMembership);
      await expect(service.addMember(1, 5)).rejects.toThrow(ConflictException);
    });
  });

  describe('removeMember', () => {
    it('should remove membership', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup as Group);
      const membership = { groupId: 1, userId: 5 } as UserGroupMembership;
      membershipRepo.findOne.mockResolvedValue(membership);
      membershipRepo.remove.mockResolvedValue(membership);

      await expect(service.removeMember(1, 5)).resolves.toBeUndefined();
    });

    it('should throw NotFoundException if not a member', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup as Group);
      membershipRepo.findOne.mockResolvedValue(null);
      await expect(service.removeMember(1, 99)).rejects.toThrow(NotFoundException);
    });
  });
});
