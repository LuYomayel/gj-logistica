import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { StockService } from './stock.service';
import { StockMovement } from '../entities/stock-movement.entity';
import { ProductStock } from '../entities/product-stock.entity';
import { Product } from '../entities/product.entity';

// Helper to build a mock QueryRunner
function buildMockQR(overrides: Record<string, unknown> = {}) {
  const mockMovementRepo = { create: jest.fn(), save: jest.fn() };
  const mockStockRepo = {
    findOne: jest.fn().mockResolvedValue({ warehouseId: 1, productId: 1, quantity: 10 }),
    save: jest.fn(),
    create: jest.fn(),
  };
  const mockProductRepo = { decrement: jest.fn() };

  return {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      getRepository: jest.fn((entity) => {
        if (entity === StockMovement) return mockMovementRepo;
        if (entity === ProductStock) return mockStockRepo;
        if (entity === Product) return mockProductRepo;
      }),
    },
    _mockMovementRepo: mockMovementRepo,
    _mockStockRepo: mockStockRepo,
    ...overrides,
  };
}

const mockQb = {
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
};

describe('StockService', () => {
  let service: StockService;
  let mockDataSource: jest.Mocked<any>;

  beforeEach(async () => {
    mockDataSource = { createQueryRunner: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockService,
        {
          provide: getRepositoryToken(StockMovement),
          useValue: {
            find: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQb),
          },
        },
        { provide: getRepositoryToken(ProductStock), useValue: {} },
        { provide: getRepositoryToken(Product), useValue: {} },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<StockService>(StockService);
  });

  describe('findMovements', () => {
    it('should return paginated movements', async () => {
      const result = await service.findMovements({ page: 1, limit: 50 });
      expect(result.total).toBe(0);
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe('createManualMovement', () => {
    it('should create a stock movement and update product stock', async () => {
      const qr = buildMockQR();
      const savedMovement = { id: 1, quantity: 5, movementType: 0 } as StockMovement;
      qr._mockMovementRepo.create.mockReturnValue(savedMovement);
      qr._mockMovementRepo.save.mockResolvedValue(savedMovement);
      qr._mockStockRepo.save.mockResolvedValue({});
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      const result = await service.createManualMovement(
        { warehouseId: 1, productId: 1, quantity: 5 },
        1,
      );
      expect(result.id).toBe(1);
      expect(qr.commitTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException when resulting stock would be negative', async () => {
      const qr = buildMockQR();
      qr._mockStockRepo.findOne.mockResolvedValue({ quantity: 3 });
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      await expect(
        service.createManualMovement({ warehouseId: 1, productId: 1, quantity: -10 }, 1),
      ).rejects.toThrow(BadRequestException);
      expect(qr.rollbackTransaction).toHaveBeenCalled();
    });

    it('should create product_stock entry if not exists', async () => {
      const qr = buildMockQR();
      qr._mockStockRepo.findOne.mockResolvedValue(null);
      const newStock = { warehouseId: 1, productId: 1, quantity: 5 };
      qr._mockStockRepo.create.mockReturnValue(newStock);
      qr._mockStockRepo.save.mockResolvedValue(newStock);
      const savedMovement = { id: 2, quantity: 5 } as StockMovement;
      qr._mockMovementRepo.create.mockReturnValue(savedMovement);
      qr._mockMovementRepo.save.mockResolvedValue(savedMovement);
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      const result = await service.createManualMovement(
        { warehouseId: 1, productId: 1, quantity: 5 },
        1,
      );
      expect(qr._mockStockRepo.create).toHaveBeenCalled();
      expect(result.quantity).toBe(5);
    });
  });
});
