import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from '../entities/product.entity';

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

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: repo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
    repo.createQueryBuilder.mockReturnValue(mockQb);
    mockQb.getManyAndCount.mockResolvedValue([[mockProduct], 1]);
    mockQb.getMany.mockResolvedValue([mockProduct]);
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const result = await service.findAll({ page: 1, limit: 50 }, null);
      expect(result.total).toBe(1);
      expect(result.items[0].ref).toBe('BI000032');
    });

    it('should apply search filter when provided', async () => {
      await service.findAll({ search: 'Remera', page: 1, limit: 50 }, null);
      expect(mockQb.andWhere).toHaveBeenCalled();
    });

    it('should apply rubro filter when provided', async () => {
      await service.findAll({ rubro: 'Indumentaria', page: 1, limit: 50 }, null);
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('rubro'),
        expect.any(Object),
      );
    });
  });

  describe('findOne', () => {
    it('should return product when found', async () => {
      repo.findOne.mockResolvedValue(mockProduct as Product);
      const result = await service.findOne(1);
      expect(result.ref).toBe('BI000032');
    });

    it('should throw NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
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
    it('should create a product', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(mockProduct as Product);
      repo.save.mockResolvedValue(mockProduct as Product);

      const result = await service.create({ ref: 'BI000032', label: 'Remera' });
      expect(result.ref).toBe('BI000032');
    });

    it('should throw ConflictException if ref exists', async () => {
      repo.findOne.mockResolvedValue(mockProduct as Product);
      await expect(service.create({ ref: 'BI000032' })).rejects.toThrow(ConflictException);
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

      const result = await service.deactivate(1);
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
