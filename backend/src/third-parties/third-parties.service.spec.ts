import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ThirdPartiesService } from './third-parties.service';
import { ThirdParty } from '../entities/third-party.entity';
import { SalesRepresentative } from '../entities/sales-representative.entity';

const mockTP: Partial<ThirdParty> = {
  id: 1,
  name: 'Corteva',
  taxId: '30-12345678-9',
  status: 1,
  isClient: 1,
  entity: 1,
};

describe('ThirdPartiesService', () => {
  let service: ThirdPartiesService;
  let repo: jest.Mocked<Repository<ThirdParty>>;
  let salesRepRepo: jest.Mocked<Repository<SalesRepresentative>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThirdPartiesService,
        {
          provide: getRepositoryToken(ThirdParty),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SalesRepresentative),
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

    service = module.get<ThirdPartiesService>(ThirdPartiesService);
    repo = module.get(getRepositoryToken(ThirdParty));
    salesRepRepo = module.get(getRepositoryToken(SalesRepresentative));
  });

  describe('findAll', () => {
    it('should return active third parties', async () => {
      repo.find.mockResolvedValue([mockTP as ThirdParty]);
      const result = await service.findAll(null);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Corteva');
    });
  });

  describe('findOne', () => {
    it('should return third party when found', async () => {
      repo.findOne.mockResolvedValue(mockTP as ThirdParty);
      const result = await service.findOne(1);
      expect(result.id).toBe(1);
    });

    it('should throw NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a third party', async () => {
      repo.create.mockReturnValue(mockTP as ThirdParty);
      repo.save.mockResolvedValue(mockTP as ThirdParty);

      const result = await service.create({ name: 'Corteva' }, null);
      expect(result.name).toBe('Corteva');
    });
  });

  describe('addSalesRep', () => {
    it('should add a sales rep', async () => {
      repo.findOne.mockResolvedValue(mockTP as ThirdParty);
      salesRepRepo.findOne.mockResolvedValue(null);
      const rep = { thirdPartyId: 1, userId: 3 } as SalesRepresentative;
      salesRepRepo.create.mockReturnValue(rep);
      salesRepRepo.save.mockResolvedValue(rep);

      const result = await service.addSalesRep(1, 3);
      expect(result.userId).toBe(3);
    });

    it('should return existing rep if already assigned', async () => {
      repo.findOne.mockResolvedValue(mockTP as ThirdParty);
      const existing = { thirdPartyId: 1, userId: 3 } as SalesRepresentative;
      salesRepRepo.findOne.mockResolvedValue(existing);

      const result = await service.addSalesRep(1, 3);
      expect(result).toBe(existing);
      expect(salesRepRepo.save).not.toHaveBeenCalled();
    });
  });
});
