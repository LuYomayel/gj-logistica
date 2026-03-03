import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InventoriesService } from './inventories.service';
import { Inventory } from '../entities/inventory.entity';
import { InventoryLine } from '../entities/inventory-line.entity';
import { ProductStock } from '../entities/product-stock.entity';
import { Product } from '../entities/product.entity';

const mockInventoryRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
};
const mockLineRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};
const mockStockRepo = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};
const mockProductRepo = {
  findOne: jest.fn(),
  increment: jest.fn(),
};

const mockQR = {
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: {
    getRepository: jest.fn(),
  },
};

const mockDataSource = {
  createQueryRunner: jest.fn().mockReturnValue(mockQR),
};

describe('InventoriesService', () => {
  let service: InventoriesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoriesService,
        { provide: getRepositoryToken(Inventory), useValue: mockInventoryRepo },
        { provide: getRepositoryToken(InventoryLine), useValue: mockLineRepo },
        { provide: getRepositoryToken(ProductStock), useValue: mockStockRepo },
        { provide: getRepositoryToken(Product), useValue: mockProductRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<InventoriesService>(InventoriesService);
  });

  describe('findAll', () => {
    it('should return paginated inventories', async () => {
      const mockQB = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[{ id: 1, ref: 'INV001' }], 1]),
      };
      mockInventoryRepo.createQueryBuilder.mockReturnValue(mockQB);

      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return inventory with lines', async () => {
      const inv = { id: 1, ref: 'INV001', status: 0 };
      mockInventoryRepo.findOne.mockResolvedValue(inv);
      mockLineRepo.find.mockResolvedValue([
        { id: 1, inventoryId: 1, warehouseId: 1, productId: 10, expectedQuantity: null, realQuantity: 5 },
      ]);
      mockStockRepo.findOne.mockResolvedValue({ quantity: 10 });

      const result = await service.findOne(1);
      expect(result.id).toBe(1);
      expect(result.lines).toHaveLength(1);
      expect(result.lines[0].expectedQuantity).toBe(10);
    });

    it('should throw NotFoundException when not found', async () => {
      mockInventoryRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new inventory in draft status', async () => {
      const dto = { ref: 'INV2026-001', label: 'Inventario general', warehouseId: 1 };
      const created = { id: 1, ...dto, status: 0, createdByUserId: 5 };
      mockInventoryRepo.create.mockReturnValue(created);
      mockInventoryRepo.save.mockResolvedValue(created);

      const result = await service.create(dto, 5);
      expect(result.status).toBe(0);
      expect(mockInventoryRepo.save).toHaveBeenCalledWith(created);
    });
  });

  describe('addLine', () => {
    it('should add a line to a draft inventory', async () => {
      const inv = { id: 1, status: 0 };
      mockInventoryRepo.findOne.mockResolvedValue(inv);
      mockStockRepo.findOne.mockResolvedValue({ quantity: 50 });
      const line = { id: 1, inventoryId: 1, warehouseId: 1, productId: 5, expectedQuantity: 50, realQuantity: 48 };
      mockLineRepo.create.mockReturnValue(line);
      mockLineRepo.save.mockResolvedValue(line);

      const result = await service.addLine(1, { warehouseId: 1, productId: 5, realQuantity: 48 }, 3);
      expect(result.expectedQuantity).toBe(50);
      expect(result.realQuantity).toBe(48);
    });

    it('should throw BadRequestException when inventory is validated', async () => {
      mockInventoryRepo.findOne.mockResolvedValue({ id: 1, status: 1 });
      await expect(
        service.addLine(1, { warehouseId: 1, productId: 5, realQuantity: 10 }, 3),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateLine', () => {
    it('should update the real quantity of a line', async () => {
      mockInventoryRepo.findOne.mockResolvedValue({ id: 1, status: 0 });
      const line = { id: 2, inventoryId: 1, realQuantity: 5 };
      mockLineRepo.findOne.mockResolvedValue(line);
      mockLineRepo.save.mockResolvedValue({ ...line, realQuantity: 10 });

      const result = await service.updateLine(1, 2, { realQuantity: 10 });
      expect(result.realQuantity).toBe(10);
    });

    it('should throw NotFoundException for unknown line', async () => {
      mockInventoryRepo.findOne.mockResolvedValue({ id: 1, status: 0 });
      mockLineRepo.findOne.mockResolvedValue(null);
      await expect(service.updateLine(1, 999, { realQuantity: 5 })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a draft inventory', async () => {
      const inv = { id: 1, status: 0 };
      mockInventoryRepo.findOne.mockResolvedValue(inv);
      mockInventoryRepo.remove.mockResolvedValue(inv);
      await service.remove(1);
      expect(mockInventoryRepo.remove).toHaveBeenCalledWith(inv);
    });

    it('should throw BadRequestException when trying to delete a validated inventory', async () => {
      mockInventoryRepo.findOne.mockResolvedValue({ id: 1, status: 1 });
      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('validate', () => {
    it('should throw BadRequestException when already validated', async () => {
      const mockInvRepo = { findOne: jest.fn().mockResolvedValue({ id: 1, status: 1 }) };
      mockQR.manager.getRepository.mockReturnValue(mockInvRepo);

      await expect(service.validate(1, 3)).rejects.toThrow(BadRequestException);
      expect(mockQR.rollbackTransaction).toHaveBeenCalled();
    });

    it('should generate movements and validate inventory', async () => {
      const inventory = { id: 1, ref: 'INV001', status: 0 };
      const lines = [
        { id: 1, inventoryId: 1, warehouseId: 1, productId: 10, realQuantity: 5, expectedQuantity: null },
      ];
      const ps = { warehouseId: 1, productId: 10, quantity: 8 };

      const mockInvRepo = {
        findOne: jest.fn().mockResolvedValue(inventory),
        update: jest.fn().mockResolvedValue({}),
      };
      const mockLineRepoQR = {
        find: jest.fn().mockResolvedValue(lines),
        save: jest.fn().mockResolvedValue(lines[0]),
      };
      const mockStockRepoQR = {
        findOne: jest.fn().mockResolvedValue(ps),
        save: jest.fn().mockResolvedValue(ps),
        create: jest.fn(),
      };
      const mockMovRepo = {
        save: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockImplementation((d) => d),
      };
      const mockProductRepoQR = { increment: jest.fn().mockResolvedValue({}) };

      mockQR.manager.getRepository.mockImplementation((entity: any) => {
        const name = typeof entity === 'function' ? entity.name : entity;
        if (name === 'Inventory') return mockInvRepo;
        if (name === 'InventoryLine') return mockLineRepoQR;
        if (name === 'ProductStock') return mockStockRepoQR;
        if (name === 'StockMovement') return mockMovRepo;
        if (name === 'Product') return mockProductRepoQR;
        return {};
      });

      // Override findOne for post-update return
      mockInvRepo.findOne
        .mockResolvedValueOnce(inventory)        // first call (check status)
        .mockResolvedValueOnce({ ...inventory, status: 1 }); // after update

      await service.validate(1, 3);
      expect(mockQR.commitTransaction).toHaveBeenCalled();
      expect(mockMovRepo.save).toHaveBeenCalled();
    });
  });
});
