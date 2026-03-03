import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Contact } from '../entities/contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';

export class UpdateContactDto extends CreateContactDto {}

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact) private repo: Repository<Contact>,
  ) {}

  async findAll(search?: string): Promise<Contact[]> {
    if (search) {
      return this.repo.find({
        where: [
          { firstName: ILike(`%${search}%`) },
          { lastName: ILike(`%${search}%`) },
          { nombreFantasia: ILike(`%${search}%`) },
        ],
        order: { lastName: 'ASC' },
      });
    }
    return this.repo.find({ order: { lastName: 'ASC' } });
  }

  async findOne(id: number): Promise<Contact> {
    const contact = await this.repo.findOne({
      where: { id },
      relations: { thirdParty: true },
    });
    if (!contact) throw new NotFoundException(`Contacto ${id} no encontrado`);
    return contact;
  }

  async create(dto: CreateContactDto): Promise<Contact> {
    if (dto.dni) {
      const existing = await this.repo.findOne({ where: { dni: dto.dni } });
      if (existing) throw new ConflictException(`DNI ${dto.dni} ya registrado`);
    }
    const contact = this.repo.create({ ...dto, status: 1 });
    return this.repo.save(contact);
  }

  async update(id: number, dto: Partial<UpdateContactDto>): Promise<Contact> {
    const contact = await this.findOne(id);
    if (dto.dni && dto.dni !== contact.dni) {
      const existing = await this.repo.findOne({ where: { dni: dto.dni } });
      if (existing) throw new ConflictException(`DNI ${dto.dni} ya registrado`);
    }
    Object.assign(contact, dto);
    return this.repo.save(contact);
  }

  async deactivate(id: number): Promise<Contact> {
    const contact = await this.findOne(id);
    contact.status = 0;
    return this.repo.save(contact);
  }
}
