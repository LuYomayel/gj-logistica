import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { ProductsService, ProductContext } from './products.service';
import { Product } from '../entities/product.entity';
import { Tenant } from '../entities/tenant.entity';

const superAdmin: ProductContext = { userId: 1, tenantId: null, userType: 'super_admin' };
const client = (tid = 5): ProductContext => ({ userId: 2, tenantId: tid, userType: 'client_user' });

/** Mock de EntityManager para reserveNextRef (INSERT + SELECT LAST_INSERT_ID + findOne colisión). */
function makeManager(seq: number, existingRefs: string[] = []) {
  return {
    query: jest.fn((sql: string) =>
      /LAST_INSERT_ID\(\)\s+AS\s+seq/i.test(sql)
        ? Promise.resolve([{ seq }])
        : Promise.resolve([]),
    ),
    findOne: jest.fn((_e: unknown, opts: { where: { ref: string } }) =>
      Promise.resolve(existingRefs.includes(opts.where.ref) ? { id: 1, ref: opts.where.ref } : null),
    ),
    create: jest.fn((_e: unknown, data: Record<string, unknown>) => data),
    save: jest.fn((p: Record<string, unknown>) => Promise.resolve({ id: 100, ...p })),
  };
}

describe('ProductsService — autogeneración de ref por organización', () => {
  let service: ProductsService;
  let repo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let tenantRepo: { findOne: jest.Mock };
  let dataSource: {
    query: jest.Mock;
    createQueryRunner: jest.Mock;
    manager: ReturnType<typeof makeManager>;
  };

  async function build() {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: repo },
        { provide: getRepositoryToken(Tenant), useValue: tenantRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = module.get(ProductsService);
  }

  beforeEach(() => {
    repo = { findOne: jest.fn().mockResolvedValue(null), create: jest.fn(), save: jest.fn() };
    // SYNG BIOLIGOCALS → code "SYNG BIO" → prefijo "SYNG-BIO"
    tenantRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 1, name: 'SYNG BIOLIGOCALS', code: 'SYNG BIO', isActive: true }),
    };
    dataSource = {
      query: jest.fn().mockResolvedValue([]),
      createQueryRunner: jest.fn(),
      manager: makeManager(1),
    };
  });

  describe('peekNextRef (preview, no consume)', () => {
    it('super_admin sin tenantId → BadRequestException', async () => {
      await build();
      await expect(service.peekNextRef(superAdmin, undefined)).rejects.toThrow(BadRequestException);
    });

    it('arranca en 1 cuando no hay secuencia ni productos', async () => {
      dataSource.query.mockResolvedValue([]); // sin fila de secuencia
      await build();
      const res = await service.peekNextRef(superAdmin, 1);
      expect(res).toEqual({ ref: 'SYNG-BIO-1', prefix: 'SYNG-BIO' });
    });

    it('usa currentSeq+1 cuando ya hay secuencia (9 → SYNG-BIO-10)', async () => {
      dataSource.query.mockResolvedValue([{ currentSeq: 9 }]);
      await build();
      const res = await service.peekNextRef(superAdmin, 1);
      expect(res.ref).toBe('SYNG-BIO-10');
    });

    it('saltea refs ya existentes (PREFIX-1 ocupado → PREFIX-2)', async () => {
      dataSource.query.mockResolvedValue([]); // sin secuencia → arranca en 1
      repo.findOne.mockImplementation((opts: { where: { ref: string } }) =>
        Promise.resolve(opts.where.ref === 'SYNG-BIO-1' ? { id: 1 } : null),
      );
      await build();
      const res = await service.peekNextRef(superAdmin, 1);
      expect(res.ref).toBe('SYNG-BIO-2');
    });

    it('client_user usa su propio tenant (ignora param)', async () => {
      dataSource.query.mockResolvedValue([{ currentSeq: 0 }]);
      await build();
      const res = await service.peekNextRef(client(5), 999);
      // tenantRepo.findOne se llama con el tenant del ctx (5), no 999
      expect(tenantRepo.findOne).toHaveBeenCalledWith({ where: { id: 5 } });
      expect(res.ref).toBe('SYNG-BIO-1');
    });
  });

  describe('create con autoRef', () => {
    it('genera el ref atómicamente y guarda dentro de transacción', async () => {
      const manager = makeManager(10); // SELECT LAST_INSERT_ID → 10
      const qr = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager,
      };
      dataSource.createQueryRunner.mockReturnValue(qr);
      await build();

      const saved = await service.create(
        { autoRef: true, tenantId: 1, label: 'Mochila' } as never,
        superAdmin,
      );

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO product_ref_sequences'),
        [1],
      );
      expect(qr.commitTransaction).toHaveBeenCalled();
      expect(qr.release).toHaveBeenCalled();
      expect((saved as unknown as { ref: string }).ref).toBe('SYNG-BIO-10');
      expect((saved as unknown as { entity: number }).entity).toBe(1);
    });

    it('super_admin con autoRef pero sin tenantId → BadRequestException', async () => {
      await build();
      await expect(
        service.create({ autoRef: true, label: 'x' } as never, superAdmin),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('create manual (sin autoRef)', () => {
    it('exige ref si no es autoRef', async () => {
      await build();
      await expect(
        service.create({ tenantId: 1, label: 'x' } as never, superAdmin),
      ).rejects.toThrow(BadRequestException);
    });

    it('usa el ref provisto tal cual', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockImplementation((d: Record<string, unknown>) => d);
      repo.save.mockImplementation((p: Record<string, unknown>) => Promise.resolve({ id: 7, ...p }));
      await build();
      const saved = await service.create(
        { ref: 'MANUAL-99', tenantId: 1, label: 'x' } as never,
        superAdmin,
      );
      expect((saved as unknown as { ref: string }).ref).toBe('MANUAL-99');
    });
  });

  describe('update — regenera ref si cambia la organización', () => {
    it('al cambiar tenantId (super_admin) regenera el ref con el prefijo nuevo', async () => {
      repo.findOne.mockResolvedValue({ id: 50, ref: 'OLD-3', entity: 1 });
      repo.save.mockImplementation((p: Record<string, unknown>) => Promise.resolve(p));
      // nuevo tenant id=3 → code "NK"
      tenantRepo.findOne.mockResolvedValue({ id: 3, name: 'NK', code: 'NK', isActive: true });
      dataSource.manager = makeManager(4); // SELECT LAST_INSERT_ID → 4
      await build();

      const res = await service.update(50, { tenantId: 3 } as never, superAdmin);
      expect((res as unknown as { entity: number }).entity).toBe(3);
      expect((res as unknown as { ref: string }).ref).toBe('NK-4');
    });

    it('si NO cambia la org, no regenera el ref', async () => {
      repo.findOne.mockResolvedValue({ id: 50, ref: 'NK-3', entity: 3 });
      repo.save.mockImplementation((p: Record<string, unknown>) => Promise.resolve(p));
      await build();
      const res = await service.update(50, { tenantId: 3, label: 'nuevo' } as never, superAdmin);
      expect((res as unknown as { ref: string }).ref).toBe('NK-3');
    });
  });
});
