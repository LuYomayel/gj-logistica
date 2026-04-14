import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { ProductImage } from '../entities/product-image.entity';
import { ProductsService, ProductContext } from './products.service';

export const PRODUCT_IMAGES_ROOT =
  process.env.PRODUCT_IMAGES_ROOT ?? '/var/www/gj-logistica/uploads/products';

const MAIN_FILENAME = 'image.webp';
const THUMB_FILENAME = 'thumb.webp';
const THUMB_SIZE = 200;

// Magic byte signatures for supported image formats.
const MAGIC = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  webp: [0x52, 0x49, 0x46, 0x46], // "RIFF" — followed by size + "WEBP"
  gif: [0x47, 0x49, 0x46, 0x38],
};

function matchesMagic(buf: Buffer, sig: number[]): boolean {
  if (buf.length < sig.length) return false;
  for (let i = 0; i < sig.length; i++) if (buf[i] !== sig[i]) return false;
  return true;
}

function detectImageFormat(buf: Buffer): 'jpeg' | 'png' | 'webp' | 'gif' | null {
  if (matchesMagic(buf, MAGIC.jpeg)) return 'jpeg';
  if (matchesMagic(buf, MAGIC.png)) return 'png';
  if (matchesMagic(buf, MAGIC.gif)) return 'gif';
  if (matchesMagic(buf, MAGIC.webp) && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}

@Injectable()
export class ProductImagesService {
  private storageRoot: string = PRODUCT_IMAGES_ROOT;

  constructor(
    @InjectRepository(ProductImage) private readonly repo: Repository<ProductImage>,
    private readonly productsService: ProductsService,
  ) {
    if (!path.isAbsolute(this.storageRoot)) {
      throw new Error(
        `PRODUCT_IMAGES_ROOT must be an absolute path, got: ${this.storageRoot}`,
      );
    }
  }

  private dirFor(productId: number): string {
    return path.join(this.storageRoot, String(productId));
  }

  async upload(
    productId: number,
    buffer: Buffer,
    _mimeType: string,
    ctx: ProductContext,
  ): Promise<ProductImage> {
    // Tenant scoping + existence
    await this.productsService.findOne(productId, ctx);

    // Magic-byte validation (don't trust the client MIME)
    const format = detectImageFormat(buffer);
    if (!format) {
      throw new BadRequestException('El archivo no es una imagen válida (JPEG/PNG/WebP/GIF)');
    }

    const dir = this.dirFor(productId);
    await fs.promises.mkdir(dir, { recursive: true });
    const mainPath = path.join(dir, MAIN_FILENAME);
    const thumbPath = path.join(dir, THUMB_FILENAME);

    const mainBuf = await sharp(buffer).webp({ quality: 82 }).toBuffer();
    const thumbBuf = await sharp(buffer)
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();
    const meta = await sharp(mainBuf).metadata();

    await Promise.all([
      fs.promises.writeFile(mainPath, mainBuf),
      fs.promises.writeFile(thumbPath, thumbBuf),
    ]);

    // Concurrency-safe UPSERT — avoids TOCTOU race on UNIQUE(productId)
    await this.repo
      .createQueryBuilder()
      .insert()
      .into(ProductImage)
      .values({
        productId,
        filename: MAIN_FILENAME,
        mimeType: 'image/webp',
        sizeBytes: mainBuf.length,
        width: meta.width ?? null,
        height: meta.height ?? null,
      })
      .orUpdate(
        ['filename', 'mimeType', 'sizeBytes', 'width', 'height'],
        ['productId'],
      )
      .execute();

    const saved = await this.repo.findOne({ where: { productId } });
    if (!saved) throw new NotFoundException(`No se pudo persistir la imagen del producto ${productId}`);
    return saved;
  }

  async get(
    productId: number,
    thumb: boolean,
    ctx: ProductContext,
  ): Promise<{ image: ProductImage; fullPath: string }> {
    await this.productsService.findOne(productId, ctx);
    const image = await this.repo.findOne({ where: { productId } });
    if (!image) throw new NotFoundException(`Producto ${productId} no tiene imagen`);
    const fullPath = path.join(this.dirFor(productId), thumb ? THUMB_FILENAME : MAIN_FILENAME);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException(`Archivo de imagen no encontrado en disco para el producto ${productId}`);
    }
    return { image, fullPath };
  }

  async remove(productId: number, ctx: ProductContext): Promise<void> {
    await this.productsService.findOne(productId, ctx);
    const image = await this.repo.findOne({ where: { productId } });
    if (!image) throw new NotFoundException(`Producto ${productId} no tiene imagen`);

    // Delete DB row first — if disk cleanup fails, state is still recoverable
    await this.repo.delete({ productId });

    const dir = this.dirFor(productId);
    for (const name of [MAIN_FILENAME, THUMB_FILENAME]) {
      const p = path.join(dir, name);
      try { await fs.promises.unlink(p); } catch { /* missing — ignore */ }
    }
    try { await fs.promises.rmdir(dir); } catch { /* dir not empty or missing — ignore */ }
  }
}
