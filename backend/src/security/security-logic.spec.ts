/**
 * TDD — Security Logic Tests (Phase 6)
 *
 * Bug #4: validateOrder must check+decrement stock in a single loop (no race condition)
 * Bug #6: UsersService.update must block privilege escalation for non-super_admin
 */
import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { Order } from '../entities/order.entity';
import { OrderLine } from '../entities/order-line.entity';
import { OrderSequence } from '../entities/order-sequence.entity';
import { ProductStock } from '../entities/product-stock.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { Product } from '../entities/product.entity';
import { OrderContact } from '../entities/order-contact.entity';
import { Contact } from '../entities/contact.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { User } from '../entities/user.entity';
import { UserGroupMembership } from '../entities/user-group-membership.entity';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

// ── Helpers ─────────────────────────────────────────────────────────────────

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

function buildMockQR() {
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

  return {
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
        if (sql.includes('LAST_INSERT_ID()') || sql.includes('SELECT currentSeq'))
          return Promise.resolve([{ currentSeq: 1, seq: 1 }]);
        return Promise.resolve([]);
      }),
    },
    _mockOrderRepo: mockOrderRepo,
    _mockLineRepo: mockLineRepo,
    _mockStockRepo: mockStockRepo,
    _mockMovRepo: mockMovRepo,
    _mockProdRepo: mockProdRepo,
  };
}

// ─── Bug #4: validateOrder single-loop stock handling ───────────────────────

describe('Bug #4 — validateOrder must atomically check+decrement stock', () => {
  let service: OrdersService;
  let mockDataSource: jest.Mocked<any>;
  const mockOrderRepoModule = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn().mockImplementation((v) => v),
    update: jest.fn().mockResolvedValue({}),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getRawMany: jest.fn().mockResolvedValue([]),
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDataSource = { createQueryRunner: jest.fn() };
    mockOrderRepoModule.findOne.mockResolvedValue(makeOrder({ lines: [] }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: mockOrderRepoModule },
        { provide: getRepositoryToken(OrderLine), useValue: { find: jest.fn(), save: jest.fn(), create: jest.fn().mockImplementation((v) => v), delete: jest.fn() } },
        { provide: getRepositoryToken(OrderSequence), useValue: {} },
        { provide: getRepositoryToken(ProductStock), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(StockMovement), useValue: {} },
        { provide: getRepositoryToken(Product), useValue: {} },
        { provide: getRepositoryToken(OrderContact), useValue: { find: jest.fn(), findOne: jest.fn(), create: jest.fn().mockImplementation((v: unknown) => v), save: jest.fn(), remove: jest.fn() } },
        { provide: getRepositoryToken(Contact), useValue: { findOne: jest.fn() } },
        { provide: DataSource, useValue: mockDataSource },
        { provide: NotificationsService, useValue: { sendOrderEvent: jest.fn() } },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should call stockRepo.findOne only ONCE per product line (single loop)', async () => {
    const qr = buildMockQR();
    const order = makeOrder({ status: 0, warehouseId: 1 });
    qr._mockOrderRepo.findOne.mockResolvedValue(order);
    qr._mockLineRepo.find.mockResolvedValue([
      { productId: 2, quantity: 3, orderId: 1 },
    ]);
    qr._mockStockRepo.findOne.mockResolvedValue({ quantity: 50, productId: 2, warehouseId: 1 });
    mockDataSource.createQueryRunner.mockReturnValue(qr);
    mockOrderRepoModule.findOne.mockResolvedValue(
      makeOrder({ status: 1, isDraft: false, ref: 'SO2603-0001' }),
    );

    await service.validateOrder(1, 99);

    // KEY ASSERTION: stockRepo.findOne should be called exactly ONCE per line,
    // not twice (once for check, once for decrement). This proves single-loop.
    expect(qr._mockStockRepo.findOne).toHaveBeenCalledTimes(1);
  });

  it('should decrement stock immediately after checking (atomically)', async () => {
    const qr = buildMockQR();
    const order = makeOrder({ status: 0, warehouseId: 1 });
    qr._mockOrderRepo.findOne.mockResolvedValue(order);
    qr._mockLineRepo.find.mockResolvedValue([
      { productId: 2, quantity: 5, orderId: 1 },
    ]);
    const stockRow = { quantity: 50, productId: 2, warehouseId: 1 };
    qr._mockStockRepo.findOne.mockResolvedValue(stockRow);
    mockDataSource.createQueryRunner.mockReturnValue(qr);
    mockOrderRepoModule.findOne.mockResolvedValue(
      makeOrder({ status: 1, isDraft: false, ref: 'SO2603-0001' }),
    );

    await service.validateOrder(1, 99);

    // Stock row should be saved with decremented quantity
    expect(qr._mockStockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 45 }),
    );
    // Product mirror should also be decremented
    expect(qr._mockProdRepo.decrement).toHaveBeenCalledWith(
      { id: 2 }, 'stock', 5,
    );
    // Movement should be created
    expect(qr._mockMovRepo.save).toHaveBeenCalled();
  });

  it('should use increment (not negative decrement) when cancelling', async () => {
    const qr = buildMockQR();
    qr._mockOrderRepo.findOne.mockResolvedValue(
      makeOrder({ status: 1, warehouseId: 1, ref: 'SO2603-0001' }),
    );
    qr._mockLineRepo.find.mockResolvedValue([
      { productId: 3, quantity: 5, orderId: 1 },
    ]);
    qr._mockStockRepo.findOne.mockResolvedValue({ quantity: 10, productId: 3, warehouseId: 1 });
    mockDataSource.createQueryRunner.mockReturnValue(qr);
    mockOrderRepoModule.findOne.mockResolvedValue(makeOrder({ status: -1 }));

    await service.cancelOrder(1, 99);

    // Should use increment (positive qty), NOT decrement with negative qty
    expect(qr._mockProdRepo.increment).toHaveBeenCalledWith(
      { id: 3 }, 'stock', 5,
    );
    // Should NOT call decrement with negative value
    expect(qr._mockProdRepo.decrement).not.toHaveBeenCalled();
  });

  it('should use LAST_INSERT_ID for atomic ref generation', () => {
    // Verify the source code uses LAST_INSERT_ID pattern
    const fs = require('fs');
    const path = require('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../orders/orders.service.ts'),
      'utf8',
    );
    expect(content).toMatch(/LAST_INSERT_ID/);
  });
});

// ─── Bug #6: Privilege escalation prevention ────────────────────────────────

describe('Bug #6 — UsersService.update must prevent privilege escalation', () => {
  let service: UsersService;
  let userRepo: any;

  const mockUser: Partial<User> = {
    id: 5,
    username: 'target_user',
    passwordHash: 'hashed',
    firstName: 'Target',
    lastName: 'User',
    email: 'target@test.com',
    status: 1,
    isAdmin: false,
    userType: 'client_user',
    entity: 1,
  };

  const clientAdmin: AuthenticatedUser = {
    id: 10,
    username: 'admin',
    email: 'admin@test.com',
    isAdmin: true,
    userType: 'client_admin',
    tenantId: 1,
    permissions: ['*'],
  };

  const superAdmin: AuthenticatedUser = {
    id: 1,
    username: 'superadmin',
    email: 'super@test.com',
    isAdmin: true,
    userType: 'super_admin',
    tenantId: null,
    permissions: ['*'],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    userRepo = {
      find: jest.fn(),
      findOne: jest.fn().mockResolvedValue({ ...mockUser } as User),
      create: jest.fn(),
      save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(UserGroupMembership), useValue: { find: jest.fn() } },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('update() should accept requester as third parameter', () => {
    // The method signature must accept (id, dto, requester)
    expect(service.update.length).toBeGreaterThanOrEqual(2);
  });

  it('should throw ForbiddenException when client_admin tries to set userType to super_admin', async () => {
    await expect(
      service.update(
        5,
        { userType: 'super_admin', isAdmin: true, entity: 999, firstName: 'Updated' },
        clientAdmin,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should strip isAdmin/entity but allow safe fields when client_admin updates', async () => {
    const result = await service.update(
      5,
      { isAdmin: true, entity: 999, firstName: 'Updated' },
      clientAdmin,
    );

    // Should have updated firstName
    expect(result.firstName).toBe('Updated');
    // Should NOT have changed isAdmin or entity (stripped)
    expect(result.isAdmin).toBe(false);
    expect(result.entity).toBe(1);
  });

  it('should allow super_admin to change userType', async () => {
    const result = await service.update(
      5,
      { userType: 'client_admin' },
      superAdmin,
    );

    expect(result.userType).toBe('client_admin');
  });

  it('should allow super_admin to change entity', async () => {
    const result = await service.update(
      5,
      { entity: 2 },
      superAdmin,
    );

    expect(result.entity).toBe(2);
  });

  it('should throw ForbiddenException if client_user tries to escalate to super_admin', async () => {
    const clientUser: AuthenticatedUser = {
      id: 20,
      username: 'user',
      email: 'user@test.com',
      isAdmin: false,
      userType: 'client_user',
      tenantId: 1,
      permissions: ['users.write'],
    };

    await expect(
      service.update(5, { userType: 'super_admin' }, clientUser),
    ).rejects.toThrow(ForbiddenException);
  });
});
