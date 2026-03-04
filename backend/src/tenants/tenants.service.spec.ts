import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantsService } from './tenants.service';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';

const mockTenant = { id: 1, name: 'Corteva', code: 'CORTEVA', isActive: true };
const mockUser = { id: 1, username: 'admin', email: 'a@b.com', entity: 1, userType: 'super_admin' };

const mockTenantRepo = {
  find: jest.fn().mockResolvedValue([mockTenant]),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockUserRepo = {
  find: jest.fn().mockResolvedValue([mockUser]),
};

describe('TenantsService', () => {
  let service: TenantsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: getRepositoryToken(Tenant), useValue: mockTenantRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
      ],
    }).compile();
    service = module.get<TenantsService>(TenantsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns all tenants', async () => {
      const result = await service.findAll();
      expect(result).toEqual([mockTenant]);
      expect(mockTenantRepo.find).toHaveBeenCalledWith({ order: { id: 'ASC' } });
    });
  });

  describe('findOne', () => {
    it('returns tenant if found', async () => {
      mockTenantRepo.findOne.mockResolvedValueOnce(mockTenant);
      const result = await service.findOne(1);
      expect(result).toEqual(mockTenant);
    });

    it('throws NotFoundException if not found', async () => {
      mockTenantRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a new tenant', async () => {
      mockTenantRepo.findOne.mockResolvedValueOnce(null); // no conflict
      mockTenantRepo.create.mockReturnValue({ ...mockTenant });
      mockTenantRepo.save.mockResolvedValueOnce({ ...mockTenant });
      const result = await service.create({ name: 'Corteva', code: 'CORTEVA' });
      expect(result).toEqual(mockTenant);
    });

    it('throws ConflictException if code already exists', async () => {
      mockTenantRepo.findOne.mockResolvedValueOnce(mockTenant); // conflict
      await expect(service.create({ name: 'Corteva2', code: 'CORTEVA' }))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('updates tenant', async () => {
      mockTenantRepo.findOne.mockResolvedValueOnce(mockTenant); // findOne
      mockTenantRepo.save.mockResolvedValueOnce({ ...mockTenant, name: 'Updated' });
      const result = await service.update(1, { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('throws NotFoundException if not found', async () => {
      mockTenantRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.update(999, { name: 'x' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('sets isActive to false', async () => {
      const tenant = { ...mockTenant, isActive: true };
      mockTenantRepo.findOne.mockResolvedValueOnce(tenant);
      mockTenantRepo.save.mockResolvedValueOnce({ ...tenant, isActive: false });
      const result = await service.deactivate(1);
      expect(result.isActive).toBe(false);
    });
  });

  describe('findUsers', () => {
    it('returns users for tenant', async () => {
      mockTenantRepo.findOne.mockResolvedValueOnce(mockTenant); // tenant exists check
      const result = await service.findUsers(1);
      expect(result).toEqual([mockUser]);
    });

    it('throws NotFoundException if tenant not found', async () => {
      mockTenantRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.findUsers(999)).rejects.toThrow(NotFoundException);
    });
  });
});
