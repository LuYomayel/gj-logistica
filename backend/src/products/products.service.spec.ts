import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from '../entities/product.entity';
import { Tenant } from '../entities/tenant.entity';

type Ctx = {
  userId: number;
  tenantId: number | null;
  userType: 'super_admin' | 'client_admin' | 'client_user';
};
const superAdminCtx: Ctx = { userId: 1, tenantId: null, userType: 'super_admin' };
const clientCtx = (tid = 1): Ctx => ({ userId: 2, tenantId: tid, userType: 'client_user' });

const mockProduct: Partial<Product> = {
  id: 1,
  ref: 'BI000032',
  label: 'Remera Azul',
  status: 1,
  stock: 10,
  stockAlertThreshold: 5,
  rubro: 'Indumentaria',
  marca: 'Nike',
  talle: 'M',
  color: 'Azul',
  entity: 1,
};

const mockQb = {
  andWhere: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[mockProduct], 1]),
  getMany: jest.fn().mockResolvedValue([mockProduct]),
};

const mockDsQb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  getRawMany: jest.fn().mockResolvedValue([]),
};

const mockDataSource = {
  createQueryBuilder: jest.fn().mockReturnValue(mockDsQb),
};

describe('ProductsService', () => {
  let service: ProductsService;
  let repo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock; createQueryBuilder: jest.Mock };
  let tenantRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    };
    tenantRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 2, name: 'Org 2', code: 'ORG2', isActive: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: repo },
        { provide: getRepositoryToken(Tenant), useValue: tenantRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
    repo.createQueryBuilder.mockReturnValue(mockQb);
    mockQb.getManyAndCount.mockResolvedValue([[mockProduct], 1]);
    mockQb.getMany.mockResolvedValue([mockProduct]);
    tenantRepo.findOne.mockResolvedValue({ id: 2, name: 'Org 2', code: 'ORG2', isActive: true });
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const result = await service.findAll({ page: 1, limit: 50 }, superAdminCtx);
      expect(result.total).toBe(1);
      expect(result.items[0].ref).toBe('BI000032');
    });

    it('should apply search filter when provided', async () => {
      await service.findAll({ search: 'Remera', page: 1, limit: 50 }, superAdminCtx);
      expect(mockQb.andWhere).toHaveBeenCalled();
    });

    it('should apply rubro filter when provided', async () => {
      await service.findAll({ rubro: 'Indumentaria', page: 1, limit: 50 }, superAdminCtx);
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('rubro'),
        expect.any(Object),
      );
    });

    it('super_admin filter by tenantId is honored', async () => {
      await service.findAll({ tenantId: 3, page: 1, limit: 50 }, superAdminCtx);
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('entity'),
        expect.objectContaining({ tenantId: 3 }),
      );
    });

    it('client_user cannot override tenant via filter.tenantId', async () => {
      await service.findAll({ tenantId: 99, page: 1, limit: 50 }, clientCtx(1));
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('entity'),
        expect.objectContaining({ tenantId: 1 }),
      );
      expect(mockQb.andWhere).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ tenantId: 99 }),
      );
    });
  });

  describe('findOne', () => {
    it('should return product when found', async () => {
      repo.findOne.mockResolvedValue(mockProduct as Product);
      const result = await service.findOne(1, superAdminCtx);
      expect(result.ref).toBe('BI000032');
    });

    it('should throw NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne(99, superAdminCtx)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByRef', () => {
    it('should find product by ref', async () => {
      repo.findOne.mockResolvedValue(mockProduct as Product);
      const result = await service.findByRef('BI000032');
      expect(result.id).toBe(1);
    });

    it('should throw NotFoundException if ref not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findByRef('NOTEXIST')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('client_user creates using their own tenant (dto.tenantId ignored)', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockImplementation((x: any) => x);
      repo.save.mockImplementation(async (x: any) => ({ ...mockProduct, ...x }));

      const result = await service.create(
        { ref: 'BI000032', label: 'Remera', tenantId: 99 } as any,
        clientCtx(7),
      );
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ entity: 7 }));
      expect(result.ref).toBe('BI000032');
    });

    it('should throw ConflictException if ref exists in same tenant', async () => {
      repo.findOne.mockResolvedValue(mockProduct as Product);
      await expect(service.create({ ref: 'BI000032' }, clientCtx(1))).rejects.toThrow(ConflictException);
    });

    it('super_admin must provide tenantId on create', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.create({ ref: 'NEW1' }, superAdminCtx)).rejects.toThrow(BadRequestException);
    });

    it('super_admin with invalid tenantId fails', async () => {
      repo.findOne.mockResolvedValue(null);
      tenantRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create({ ref: 'NEW1', tenantId: 999 } as any, superAdminCtx),
      ).rejects.toThrow(BadRequestException);
    });

    it('super_admin with inactive tenant fails', async () => {
      repo.findOne.mockResolvedValue(null);
      tenantRepo.findOne.mockResolvedValue({ id: 2, name: 'X', code: 'X', isActive: false });
      await expect(
        service.create({ ref: 'NEW1', tenantId: 2 } as any, superAdminCtx),
      ).rejects.toThrow(BadRequestException);
    });

    it('super_admin with valid tenantId creates with that entity', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockImplementation((x: any) => x);
      repo.save.mockImplementation(async (x: any) => ({ ...mockProduct, ...x }));
      const result = await service.create(
        { ref: 'NEW1', tenantId: 2 } as any,
        superAdminCtx,
      );
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ entity: 2 }));
      expect(result.ref).toBe('NEW1');
    });
  });

  describe('update', () => {
    it('super_admin can change entity via tenantId', async () => {
      const product = { ...mockProduct, entity: 1 } as Product;
      repo.findOne.mockResolvedValue(product);
      repo.save.mockImplementation(async (x: any) => x);

      const result = await service.update(1, { tenantId: 2 } as any, superAdminCtx);
      expect(result.entity).toBe(2);
    });

    it('super_admin change entity with invalid tenant fails', async () => {
      const product = { ...mockProduct, entity: 1 } as Product;
      repo.findOne.mockResolvedValue(product);
      tenantRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update(1, { tenantId: 999 } as any, superAdminCtx),
      ).rejects.toThrow(BadRequestException);
    });

    it('client_user cannot change entity (tenantId in dto ignored)', async () => {
      const product = { ...mockProduct, entity: 1 } as Product;
      repo.findOne.mockResolvedValue(product);
      repo.save.mockImplementation(async (x: any) => x);

      const result = await service.update(1, { tenantId: 99, label: 'X' } as any, clientCtx(1));
      expect(result.entity).toBe(1);
      expect(result.label).toBe('X');
    });
  });

  describe('getLowStock', () => {
    it('should return products below alert threshold', async () => {
      const result = await service.getLowStock(null);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('deactivate', () => {
    it('should set product status to 0', async () => {
      const product = { ...mockProduct, status: 1 } as Product;
      repo.findOne.mockResolvedValue(product);
      repo.save.mockResolvedValue({ ...product, status: 0 });

      const result = await service.deactivate(1, superAdminCtx);
      expect(result.status).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return popularProducts and byRubro arrays', async () => {
      mockDsQb.getRawMany.mockResolvedValue([]);
      const result = await service.getStats({}, null);
      expect(result).toHaveProperty('popularProducts');
      expect(result).toHaveProperty('byRubro');
      expect(Array.isArray(result.popularProducts)).toBe(true);
      expect(Array.isArray(result.byRubro)).toBe(true);
    });

    it('should map raw rows to typed objects', async () => {
      mockDsQb.getRawMany.mockResolvedValueOnce([
        { productId: '1', ref: 'BI000032', label: 'Remera', rubro: 'Indumentaria', orderCount: '5', totalQuantity: '12' },
      ]).mockResolvedValueOnce([
        { rubro: 'Indumentaria', productCount: '3', orderCount: '10' },
      ]);
      const result = await service.getStats({ year: 2025 }, null);
      expect(result.popularProducts[0].productId).toBe(1);
      expect(result.popularProducts[0].orderCount).toBe(5);
      expect(result.byRubro[0].rubro).toBe('Indumentaria');
    });
  });
});
