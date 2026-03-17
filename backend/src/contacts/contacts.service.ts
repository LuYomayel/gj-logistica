import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository, FindOptionsWhere } from 'typeorm';
import { Contact } from '../entities/contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';

export class UpdateContactDto extends CreateContactDto {}

@Injectable()
export class ContactsService {
  constructor(@InjectRepository(Contact) private repo: Repository<Contact>) {}

  async findAll(
    search?: string,
    tenantId?: number | null,
    thirdPartyId?: number,
  ): Promise<Contact[]> {
    const tenantFilter =
      tenantId !== null && tenantId !== undefined ? { entity: tenantId } : {};
    const tpFilter = thirdPartyId ? { thirdPartyId } : {};
    const baseFilter = { ...tenantFilter, ...tpFilter };

    if (search) {
      const where = [
        { firstName: ILike(`%${search}%`), ...baseFilter },
        { lastName: ILike(`%${search}%`), ...baseFilter },
        { nombreFantasia: ILike(`%${search}%`), ...baseFilter },
      ];
      return this.repo.find({
        where,
        relations: ['thirdParty'],
        order: { lastName: 'ASC' },
      });
    }
    return this.repo.find({
      where: baseFilter,
      relations: ['thirdParty'],
      order: { lastName: 'ASC' },
    });
  }

  async findOne(id: number, tenantId?: number | null): Promise<Contact> {
    const where: FindOptionsWhere<Contact> = { id };
    if (tenantId !== null && tenantId !== undefined) where.entity = tenantId;
    const contact = await this.repo.findOne({
      where,
      relations: { thirdParty: true },
    });
    if (!contact) throw new NotFoundException(`Contacto ${id} no encontrado`);
    return contact;
  }

  async create(
    dto: CreateContactDto,
    tenantId: number | null,
  ): Promise<Contact> {
    if (dto.dni) {
      const existing = await this.repo.findOne({ where: { dni: dto.dni } });
      if (existing) throw new ConflictException(`DNI ${dto.dni} ya registrado`);
    }
    const contact = this.repo.create({
      ...dto,
      status: 1,
      entity: tenantId ?? 1,
    });
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
