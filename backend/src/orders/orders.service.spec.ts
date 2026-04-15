import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order } from '../entities/order.entity';
import { OrderLine } from '../entities/order-line.entity';
import { OrderSequence } from '../entities/order-sequence.entity';
import { ProductStock } from '../entities/product-stock.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { Product } from '../entities/product.entity';
import { OrderContact } from '../entities/order-contact.entity';
import { Contact } from '../entities/contact.entity';
import { NotificationsService } from '../notifications/notifications.service';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    ref: 'BORRADOR-1',
    thirdPartyId: 10,
    warehouseId: 1,
    status: 0,
    isDraft: true,
    lines: [],
    ...overrides,
  } as unknown as Order;
}

function buildMockQR(overrides: Record<string, unknown> = {}) {
  const mockOrderRepo = {
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
  };
  const mockLineRepo = {
    find: jest.fn().mockResolvedValue([]),
  };
  const mockStockRepo = {
    findOne: jest.fn().mockResolvedValue({ quantity: 100 }),
    save: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockImplementation((v) => v),
  };
  const mockMovRepo = {
    create: jest.fn().mockImplementation((v) => v),
    save: jest.fn().mockResolvedValue({}),
  };
  const mockProdRepo = {
    decrement: jest.fn().mockResolvedValue({}),
    increment: jest.fn().mockResolvedValue({}),
  };

  const qr = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      getRepository: jest.fn((entity) => {
        if (entity === Order) return mockOrderRepo;
        if (entity === OrderLine) return mockLineRepo;
        if (entity === ProductStock) return mockStockRepo;
        if (entity === StockMovement) return mockMovRepo;
        if (entity === Product) return mockProdRepo;
      }),
      query: jest.fn().mockImplementation((sql: string) => {
        if (sql.includes('LAST_INSERT_ID()')) return Promise.resolve([{ seq: 1 }]);
        if (sql.includes('SELECT currentSeq')) return Promise.resolve([{ currentSeq: 1 }]);
        return Promise.resolve([]);
      }),
    },
    _mockOrderRepo: mockOrderRepo,
    _mockLineRepo: mockLineRepo,
    _mockStockRepo: mockStockRepo,
    _mockMovRepo: mockMovRepo,
    ...overrides,
  };

  return qr;
}

// ── QueryBuilder mock (for findAll + getStats) ─────────────────────────────

const mockQb = {
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  getRawMany: jest.fn().mockResolvedValue([]),
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('OrdersService', () => {
  let service: OrdersService;
  let mockDataSource: jest.Mocked<any>;

  // Repos provided at module level (used for non-transactional methods)
  const mockOrderRepoModule = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn().mockImplementation((v) => v),
    update: jest.fn().mockResolvedValue({}),
    createQueryBuilder: jest.fn().mockReturnValue(mockQb),
  };
  const mockLineRepoModule = {
    find: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((v) => v),
    delete: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDataSource = { createQueryRunner: jest.fn() };

    // findOne on module-level repo returns a complete order by default
    mockOrderRepoModule.findOne.mockResolvedValue(makeOrder({ lines: [] }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: mockOrderRepoModule },
        { provide: getRepositoryToken(OrderLine), useValue: mockLineRepoModule },
        { provide: getRepositoryToken(OrderSequence), useValue: {} },
        { provide: getRepositoryToken(ProductStock), useValue: { findOne: jest.fn().mockResolvedValue({ quantity: 100 }) } },
        { provide: getRepositoryToken(StockMovement), useValue: {} },
        { provide: getRepositoryToken(Product), useValue: {} },
        { provide: getRepositoryToken(OrderContact), useValue: { find: jest.fn().mockResolvedValue([]), findOne: jest.fn(), create: jest.fn().mockImplementation((v: unknown) => v), save: jest.fn().mockImplementation((v: unknown) => v), remove: jest.fn().mockResolvedValue({}) } },
        { provide: getRepositoryToken(Contact), useValue: { findOne: jest.fn() } },
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: NotificationsService,
          useValue: { sendOrderEvent: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  // ── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated orders', async () => {
      const result = await service.findAll({ page: 1, limit: 20 }, null);
      expect(result.total).toBe(0);
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  // ── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a draft order with temp ref', async () => {
      const savedOrder = makeOrder({ id: 5, status: 0 });
      mockOrderRepoModule.save.mockResolvedValue(savedOrder);
      mockOrderRepoModule.findOne.mockResolvedValue(savedOrder);

      const result = await service.create(
        { warehouseId: 1 },
        1,
        7,
        'client_user',
      );
      expect(mockOrderRepoModule.save).toHaveBeenCalled();
      expect(mockOrderRepoModule.update).toHaveBeenCalledWith(5, { ref: 'BORRADOR-5' });
      expect(result.status).toBe(0);
    });

    it('should save lines when provided', async () => {
      const savedOrder = makeOrder({ id: 7 });
      mockOrderRepoModule.save.mockResolvedValue(savedOrder);
      mockOrderRepoModule.findOne.mockResolvedValue(savedOrder);

      await service.create(
        { lines: [{ productId: 1, quantity: 3 }] },
        1,
        7,
        'client_user',
      );
      expect(mockLineRepoModule.save).toHaveBeenCalled();
    });

    it('requires tenantId in body when caller is super_admin', async () => {
      await expect(
        service.create({ warehouseId: 1 }, 1, null, 'super_admin'),
      ).rejects.toThrow(/organización/i);
    });

    it('auto-assigns entity from user tenant for non-super-admin', async () => {
      const savedOrder = makeOrder({ id: 9, entity: 42 });
      mockOrderRepoModule.save.mockResolvedValue(savedOrder);
      mockOrderRepoModule.findOne.mockResolvedValue(savedOrder);

      await service.create({ warehouseId: 1 }, 1, 42, 'client_user');

      const saveArgs = mockOrderRepoModule.save.mock.calls[0][0];
      expect(saveArgs.entity).toBe(42);
    });

    it('uses body tenantId when caller is super_admin', async () => {
      const savedOrder = makeOrder({ id: 10, entity: 3 });
      mockOrderRepoModule.save.mockResolvedValue(savedOrder);
      mockOrderRepoModule.findOne.mockResolvedValue(savedOrder);

      await service.create({ tenantId: 3, warehouseId: 1 }, 1, null, 'super_admin');
      const saveArgs = mockOrderRepoModule.save.mock.calls[0][0];
      expect(saveArgs.entity).toBe(3);
    });
  });

  // ── validateOrder ────────────────────────────────────────────────────────

  describe('validateOrder', () => {
    it('should validate order, decrement stock and generate ref', async () => {
      const qr = buildMockQR();
      const order = makeOrder({ status: 0, warehouseId: 1 });
      qr._mockOrderRepo.findOne.mockResolvedValue(order);
      qr._mockLineRepo.find.mockResolvedValue([
        { productId: 2, quantity: 3, orderId: 1 },
      ]);
      qr._mockStockRepo.findOne.mockResolvedValue({ quantity: 50, productId: 2, warehouseId: 1 });
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      // findOne used after commit to return the updated order
      mockOrderRepoModule.findOne.mockResolvedValue(
        makeOrder({ status: 1, isDraft: false, ref: 'SO2603-0001' }),
      );

      const result = await service.validateOrder(1, 99);
      expect(qr.commitTransaction).toHaveBeenCalled();
      expect(qr._mockOrderRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: 1, isDraft: false }),
      );
      expect(result.ref).toBe('SO2603-0001');
    });

    it('should throw BadRequestException when stock is insufficient', async () => {
      const qr = buildMockQR();
      const order = makeOrder({ status: 0, warehouseId: 1 });
      qr._mockOrderRepo.findOne.mockResolvedValue(order);
      qr._mockLineRepo.find.mockResolvedValue([{ productId: 2, quantity: 100, orderId: 1 }]);
      qr._mockStockRepo.findOne.mockResolvedValue({ quantity: 5 });
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      await expect(service.validateOrder(1, 99)).rejects.toThrow(BadRequestException);
      expect(qr.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException when order is not draft', async () => {
      const qr = buildMockQR();
      qr._mockOrderRepo.findOne.mockResolvedValue(makeOrder({ status: 1 }));
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      await expect(service.validateOrder(1, 99)).rejects.toThrow(BadRequestException);
      expect(qr.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException when no warehouse assigned', async () => {
      const qr = buildMockQR();
      qr._mockOrderRepo.findOne.mockResolvedValue(makeOrder({ warehouseId: null }));
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      await expect(service.validateOrder(1, 99)).rejects.toThrow(BadRequestException);
      expect(qr.rollbackTransaction).toHaveBeenCalled();
    });
  });

  // ── cancelOrder ──────────────────────────────────────────────────────────

  describe('cancelOrder', () => {
    it('should cancel a draft order without reversing stock', async () => {
      const qr = buildMockQR();
      qr._mockOrderRepo.findOne.mockResolvedValue(makeOrder({ status: 0 }));
      mockDataSource.createQueryRunner.mockReturnValue(qr);
      mockOrderRepoModule.findOne.mockResolvedValue(makeOrder({ status: -1 }));

      const result = await service.cancelOrder(1, 99);
      expect(qr.commitTransaction).toHaveBeenCalled();
      expect(qr._mockOrderRepo.update).toHaveBeenCalledWith(1, { status: -1 });
      // Stock not touched for a draft order
      expect(qr._mockStockRepo.save).not.toHaveBeenCalled();
    });

    it('should reverse stock when cancelling a validated order', async () => {
      const qr = buildMockQR();
      qr._mockOrderRepo.findOne.mockResolvedValue(
        makeOrder({ status: 1, warehouseId: 1, ref: 'SO2603-0001' }),
      );
      qr._mockLineRepo.find.mockResolvedValue([{ productId: 3, quantity: 5, orderId: 1 }]);
      qr._mockStockRepo.findOne.mockResolvedValue({ quantity: 10, productId: 3, warehouseId: 1 });
      mockDataSource.createQueryRunner.mockReturnValue(qr);
      mockOrderRepoModule.findOne.mockResolvedValue(makeOrder({ status: -1 }));

      await service.cancelOrder(1, 99);
      expect(qr._mockStockRepo.save).toHaveBeenCalled();
      expect(qr._mockMovRepo.save).toHaveBeenCalled();
      expect(qr.commitTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException when already cancelled', async () => {
      const qr = buildMockQR();
      qr._mockOrderRepo.findOne.mockResolvedValue(makeOrder({ status: -1 }));
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      await expect(service.cancelOrder(1, 99)).rejects.toThrow(BadRequestException);
      expect(qr.rollbackTransaction).toHaveBeenCalled();
    });
  });

  // ── shipOrder ────────────────────────────────────────────────────────────

  describe('shipOrder', () => {
    it('should advance order to delivered', async () => {
      mockOrderRepoModule.findOne.mockResolvedValue(makeOrder({ status: 2 }));

      await service.shipOrder(1);
      expect(mockOrderRepoModule.update).toHaveBeenCalledWith(1, { status: 3 });
    });

    it('should throw BadRequestException when order is not validated', async () => {
      mockOrderRepoModule.findOne.mockResolvedValue(makeOrder({ status: 0 }));
      await expect(service.shipOrder(1)).rejects.toThrow(BadRequestException);
    });
  });

  // ── getStats ─────────────────────────────────────────────────────────────

  describe('getStats', () => {
    it('should return byMonth and byStatus arrays', async () => {
      mockQb.getRawMany.mockResolvedValue([]);
      const result = await service.getStats({}, null);
      expect(result).toHaveProperty('byMonth');
      expect(result).toHaveProperty('byStatus');
      expect(Array.isArray(result.byMonth)).toBe(true);
      expect(Array.isArray(result.byStatus)).toBe(true);
    });

    it('should map raw rows to typed objects', async () => {
      mockQb.getRawMany
        .mockResolvedValueOnce([{ year: '2025', month: '3', count: '10', totalQuantity: '50' }])
        .mockResolvedValueOnce([{ status: '1', count: '8' }]);

      const result = await service.getStats({ year: 2025 }, null);
      expect(result.byMonth[0].year).toBe(2025);
      expect(result.byMonth[0].count).toBe(10);
      expect(result.byStatus[0].status).toBe(1);
      expect(result.byStatus[0].count).toBe(8);
    });
  });
});
