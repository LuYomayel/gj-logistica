import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { Contact } from '../entities/contact.entity';

const mockContact: Partial<Contact> = {
  id: 1,
  firstName: 'Maria',
  lastName: 'Garcia',
  email: 'maria@test.com',
  dni: 30123456,
  marca: 'Corteva',
  status: 1,
  entity: 1,
};

describe('ContactsService', () => {
  let service: ContactsService;
  let repo: jest.Mocked<Repository<Contact>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        {
          provide: getRepositoryToken(Contact),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
    repo = module.get(getRepositoryToken(Contact));
  });

  describe('findAll', () => {
    it('should return array of contacts', async () => {
      repo.find.mockResolvedValue([mockContact as Contact]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0].lastName).toBe('Garcia');
    });
  });

  describe('findOne', () => {
    it('should return contact with thirdParty relation', async () => {
      repo.findOne.mockResolvedValue(mockContact as Contact);
      const result = await service.findOne(1);
      expect(result.dni).toBe(30123456);
    });

    it('should throw NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a contact', async () => {
      repo.findOne.mockResolvedValue(null); // DNI no conflicts
      repo.create.mockReturnValue(mockContact as Contact);
      repo.save.mockResolvedValue(mockContact as Contact);

      const result = await service.create({
        firstName: 'Maria',
        lastName: 'Garcia',
        dni: 30123456,
      }, null);
      expect(result.firstName).toBe('Maria');
    });

    it('should throw ConflictException if DNI already exists', async () => {
      repo.findOne.mockResolvedValue(mockContact as Contact); // DNI taken
      await expect(
        service.create({ firstName: 'Otro', lastName: 'Apellido', dni: 30123456 }, null),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deactivate', () => {
    it('should set status to 0', async () => {
      const contact = { ...mockContact, status: 1 } as Contact;
      repo.findOne.mockResolvedValue(contact);
      repo.save.mockResolvedValue({ ...contact, status: 0 });

      const result = await service.deactivate(1);
      expect(result.status).toBe(0);
    });
  });
});
