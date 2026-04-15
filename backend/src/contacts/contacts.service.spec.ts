import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
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
            delete: jest.fn(),
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
    it('should create a contact for client_admin using user tenantId', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(mockContact as Contact);
      repo.save.mockResolvedValue(mockContact as Contact);

      const result = await service.create({
        firstName: 'Maria',
        lastName: 'Garcia',
        dni: 30123456,
      }, 1, 'client_admin');
      expect(result.firstName).toBe('Maria');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ entity: 1 }),
      );
    });

    it('should require tenantId in body for super_admin', async () => {
      await expect(
        service.create({ firstName: 'Maria', lastName: 'Garcia' }, null, 'super_admin'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use dto.tenantId when super_admin', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(mockContact as Contact);
      repo.save.mockResolvedValue(mockContact as Contact);

      await service.create(
        { firstName: 'Maria', lastName: 'Garcia', tenantId: 6 },
        null,
        'super_admin',
      );
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ entity: 6 }),
      );
    });

    it('should throw ConflictException if DNI already exists', async () => {
      repo.findOne.mockResolvedValue(mockContact as Contact);
      await expect(
        service.create({ firstName: 'Otro', lastName: 'Apellido', dni: 30123456 }, 1, 'client_admin'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deactivate', () => {
    it('should set status to 0', async () => {
      const contact = { ...mockContact, status: 1 } as Contact;
      repo.findOne.mockResolvedValue(contact);
      repo.save.mockResolvedValue({ ...contact, status: 0 });

      const result = await service.deactivate(1, null);
      expect(result.status).toBe(0);
    });
  });

  describe('activate', () => {
    it('should set status to 1', async () => {
      const contact = { ...mockContact, status: 0 } as Contact;
      repo.findOne.mockResolvedValue(contact);
      repo.save.mockResolvedValue({ ...contact, status: 1 });

      const result = await service.activate(1, null);
      expect(result.status).toBe(1);
    });
  });

  describe('remove', () => {
    it('should hard delete the contact', async () => {
      repo.findOne.mockResolvedValue(mockContact as Contact);
      repo.delete.mockResolvedValue({ affected: 1, raw: {} } as never);

      await service.remove(1, null);
      expect(repo.delete).toHaveBeenCalledWith({ id: 1 });
    });

    it('should throw NotFoundException when contact does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove(99, null)).rejects.toThrow(NotFoundException);
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });
});
