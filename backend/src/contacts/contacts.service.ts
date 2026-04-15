import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository, FindOptionsWhere } from 'typeorm';
import { Contact } from '../entities/contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';

export class UpdateContactDto extends CreateContactDto {}

type UserType = 'super_admin' | 'client_admin' | 'client_user';

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
    userTenantId: number | null,
    userType: UserType,
  ): Promise<Contact> {
    const { tenantId: dtoTenantId, ...rest } = dto;

    let entity: number;
    if (userType === 'super_admin') {
      if (!dtoTenantId) {
        throw new BadRequestException(
          'Como super_admin debe indicar la organización (tenantId) del contacto',
        );
      }
      entity = dtoTenantId;
    } else {
      if (userTenantId == null) {
        throw new BadRequestException('El usuario no tiene una organización asignada');
      }
      entity = userTenantId;
    }

    if (rest.dni) {
      const existing = await this.repo.findOne({ where: { dni: rest.dni } });
      if (existing) throw new ConflictException(`DNI ${rest.dni} ya registrado`);
    }
    const contact = this.repo.create({
      ...rest,
      status: 1,
      entity,
    });
    return this.repo.save(contact);
  }

  async update(
    id: number,
    dto: Partial<UpdateContactDto>,
    userTenantId: number | null,
    userType: UserType,
  ): Promise<Contact> {
    const contact = await this.findOne(id, userTenantId);
    const { tenantId: dtoTenantId, ...rest } = dto;

    if (dtoTenantId !== undefined && userType !== 'super_admin') {
      throw new ForbiddenException('No tenés permiso para cambiar la organización de un contacto');
    }

    if (rest.dni && rest.dni !== contact.dni) {
      const existing = await this.repo.findOne({ where: { dni: rest.dni } });
      if (existing) throw new ConflictException(`DNI ${rest.dni} ya registrado`);
    }

    const patch: Record<string, unknown> = { ...rest };
    if (dtoTenantId !== undefined) patch.entity = dtoTenantId;

    await this.repo.update(id, patch);
    return this.findOne(id, null);
  }

  async deactivate(id: number, tenantId: number | null): Promise<Contact> {
    const contact = await this.findOne(id, tenantId);
    contact.status = 0;
    return this.repo.save(contact);
  }
}
