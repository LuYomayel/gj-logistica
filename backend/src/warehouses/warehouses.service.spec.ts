import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';
import { Warehouse } from '../entities/warehouse.entity';
import { ProductStock } from '../entities/product-stock.entity';

const mockWarehouse: Partial<Warehouse> = {
  id: 1,
  name: 'Almacen general',
  status: 1,
  lowStock: false,
  entity: 1,
};

describe('WarehousesService', () => {
  let service: WarehousesService;
  let repo: jest.Mocked<any>;
  let stockRepo: jest.Mocked<any>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehousesService,
        {
          provide: getRepositoryToken(Warehouse),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProductStock),
          useValue: { find: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<WarehousesService>(WarehousesService);
    repo = module.get(getRepositoryToken(Warehouse));
    stockRepo = module.get(getRepositoryToken(ProductStock));
  });

  describe('findAll', () => {
    it('should return active warehouses', async () => {
      repo.find.mockResolvedValue([mockWarehouse]);
      const result = await service.findAll();
      expect(result[0].name).toBe('Almacen general');
    });
  });

  describe('findOne', () => {
    it('should return warehouse when found', async () => {
      repo.findOne.mockResolvedValue(mockWarehouse);
      const result = await service.findOne(1);
      expect(result.id).toBe(1);
    });

    it('should throw NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a warehouse', async () => {
      repo.create.mockReturnValue(mockWarehouse);
      repo.save.mockResolvedValue(mockWarehouse);
      const result = await service.create({ name: 'Almacen general' }, 1);
      expect(result.name).toBe('Almacen general');
    });
  });

  describe('getStock', () => {
    it('should return product stocks for warehouse', async () => {
      repo.findOne.mockResolvedValue(mockWarehouse);
      stockRepo.find.mockResolvedValue([]);
      const result = await service.getStock(1);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
