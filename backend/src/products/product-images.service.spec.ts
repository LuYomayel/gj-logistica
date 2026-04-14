import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import sharp from 'sharp';
import { ProductImagesService, PRODUCT_IMAGES_ROOT } from './product-images.service';
import { ProductsService } from './products.service';
import { ProductImage } from '../entities/product-image.entity';
import { Product } from '../entities/product.entity';

type Ctx = {
  userId: number;
  tenantId: number | null;
  userType: 'super_admin' | 'client_admin' | 'client_user';
};
const superAdmin: Ctx = { userId: 1, tenantId: null, userType: 'super_admin' };

let PNG_1x1: Buffer;
beforeAll(async () => {
  PNG_1x1 = await sharp({
    create: { width: 1, height: 1, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } },
  })
    .png()
    .toBuffer();
});

describe('ProductImagesService', () => {
  let service: ProductImagesService;
  let imageRepo: {
    findOne: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let qbExecute: jest.Mock;
  let productsService: { findOne: jest.Mock };
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'product-images-test-'));

    qbExecute = jest.fn().mockResolvedValue({ identifiers: [{ id: 1 }] });
    const qb: Record<string, jest.Mock> = {
      insert: jest.fn(),
      into: jest.fn(),
      values: jest.fn(),
      orUpdate: jest.fn(),
      execute: qbExecute,
    };
    qb.insert.mockReturnValue(qb);
    qb.into.mockReturnValue(qb);
    qb.values.mockReturnValue(qb);
    qb.orUpdate.mockReturnValue(qb);

    imageRepo = {
      findOne: jest.fn(),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };
    productsService = {
      findOne: jest.fn().mockResolvedValue({ id: 42, ref: 'BI000032', entity: 1 } as Product),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductImagesService,
        { provide: getRepositoryToken(ProductImage), useValue: imageRepo },
        { provide: ProductsService, useValue: productsService },
      ],
    }).compile();

    service = module.get(ProductImagesService);
    // Hot-swap the storage root constant
    (service as unknown as { storageRoot: string }).storageRoot = tmpRoot;
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  describe('upload', () => {
    it('saves image entity and writes webp + thumb files', async () => {
      imageRepo.findOne.mockResolvedValue({ id: 1, productId: 42, filename: 'image.webp', mimeType: 'image/webp', sizeBytes: 100 });
      const result = await service.upload(42, PNG_1x1, 'image/png', superAdmin);

      expect(productsService.findOne).toHaveBeenCalledWith(42, superAdmin);
      expect(qbExecute).toHaveBeenCalled();
      expect(result.filename).toBe('image.webp');

      const mainFile = path.join(tmpRoot, '42', 'image.webp');
      const thumbFile = path.join(tmpRoot, '42', 'thumb.webp');
      expect(fs.existsSync(mainFile)).toBe(true);
      expect(fs.existsSync(thumbFile)).toBe(true);
    });

    it('rejects non-image magic bytes even if MIME claims image/png', async () => {
      const fakePng = Buffer.from('<?php system($_GET[x]); ?>');
      await expect(
        service.upload(42, fakePng, 'image/png', superAdmin),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts AVIF (ISO-BMFF with `ftypavif` brand)', async () => {
      // 4 bytes size + "ftypavif" + padding — real AVIF shape, enough for magic-byte check.
      // sharp may or may not fully decode this tiny stub; that's OK — we only assert
      // the magic-byte validator no longer rejects it.
      const avifHead = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x1c]),
        Buffer.from('ftypavif', 'ascii'),
        Buffer.alloc(16),
      ]);
      // Spy on sharp to bypass actual decoding
      imageRepo.findOne.mockResolvedValue({ id: 1, productId: 42, filename: 'image.webp', mimeType: 'image/webp', sizeBytes: 100 });
      try {
        await service.upload(42, avifHead, 'image/avif', superAdmin);
      } catch (err) {
        // sharp will likely fail on this stub — ensure it's NOT a magic-byte rejection
        expect((err as Error).message).not.toMatch(/no es una imagen válida/);
      }
    });

    it('replaces existing image (UPSERT): same productId, returns updated row', async () => {
      const existing = { id: 7, productId: 42, filename: 'image.webp', mimeType: 'image/webp', sizeBytes: 100 };
      imageRepo.findOne.mockResolvedValue(existing);
      const result = await service.upload(42, PNG_1x1, 'image/png', superAdmin);
      expect(qbExecute).toHaveBeenCalled();
      expect(result.id).toBe(7);
    });

    it('throws NotFoundException when product is outside tenant scope', async () => {
      productsService.findOne.mockRejectedValue(new NotFoundException('Producto 42 no encontrado'));
      await expect(
        service.upload(42, PNG_1x1, 'image/png', { userId: 2, tenantId: 99, userType: 'client_user' }),
      ).rejects.toThrow(NotFoundException);
      expect(qbExecute).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    function seedFiles() {
      const dir = path.join(tmpRoot, '42');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'image.webp'), 'x');
      fs.writeFileSync(path.join(dir, 'thumb.webp'), 'x');
    }

    it('returns the image row and absolute file path', async () => {
      seedFiles();
      imageRepo.findOne.mockResolvedValue({ id: 7, productId: 42, filename: 'image.webp', mimeType: 'image/webp', sizeBytes: 100 });
      const { image, fullPath } = await service.get(42, false, superAdmin);
      expect(image.id).toBe(7);
      expect(fullPath).toBe(path.join(tmpRoot, '42', 'image.webp'));
    });

    it('returns thumb path when thumb=true', async () => {
      seedFiles();
      imageRepo.findOne.mockResolvedValue({ id: 7, productId: 42, filename: 'image.webp', mimeType: 'image/webp', sizeBytes: 100 });
      const { fullPath } = await service.get(42, true, superAdmin);
      expect(fullPath).toBe(path.join(tmpRoot, '42', 'thumb.webp'));
    });

    it('throws NotFoundException when product has no image', async () => {
      imageRepo.findOne.mockResolvedValue(null);
      await expect(service.get(42, false, superAdmin)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when DB row exists but file is missing on disk', async () => {
      imageRepo.findOne.mockResolvedValue({ id: 7, productId: 42, filename: 'image.webp', mimeType: 'image/webp', sizeBytes: 100 });
      await expect(service.get(42, false, superAdmin)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes row and cleans up files on disk', async () => {
      // Seed files
      const dir = path.join(tmpRoot, '42');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'image.webp'), 'x');
      fs.writeFileSync(path.join(dir, 'thumb.webp'), 'x');
      imageRepo.findOne.mockResolvedValue({ id: 7, productId: 42, filename: 'image.webp', mimeType: 'image/webp', sizeBytes: 100 });

      await service.remove(42, superAdmin);

      expect(imageRepo.delete).toHaveBeenCalledWith({ productId: 42 });
      expect(fs.existsSync(path.join(dir, 'image.webp'))).toBe(false);
      expect(fs.existsSync(path.join(dir, 'thumb.webp'))).toBe(false);
    });

    it('throws NotFoundException when no image exists', async () => {
      imageRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(42, superAdmin)).rejects.toThrow(NotFoundException);
    });
  });
});

// Silence unused-import warning on PRODUCT_IMAGES_ROOT (exported for the service but not asserted directly).
void PRODUCT_IMAGES_ROOT;
