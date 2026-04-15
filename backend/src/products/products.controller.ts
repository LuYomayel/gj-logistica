import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, ParseIntPipe,
  Res, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService, UpdateProductDto, ProductContext } from './products.service';
import { ProductImagesService } from './product-images.service';
import { CreateProductDto } from './dto/create-product.dto';
import { FilterProductDto, ProductStatsDto } from './dto/filter-product.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequiresPermission } from '../common/decorators/requires-permission.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(
    private readonly service: ProductsService,
    private readonly imagesService: ProductImagesService,
  ) {}

  private ctx(user: AuthenticatedUser): ProductContext {
    return { userId: user.id, tenantId: user.tenantId, userType: user.userType };
  }

  @Get()
  @RequiresPermission('products.read')
  @ApiOperation({ summary: 'Listar productos con filtros' })
  findAll(
    @Query() filter: FilterProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findAll(filter, this.ctx(user));
  }

  @Get('stats')
  @RequiresPermission('products.read')
  @ApiOperation({ summary: 'Estadísticas de productos: popularidad y desglose por rubro' })
  getStats(
    @Query() filter: ProductStatsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getStats(filter, user.tenantId);
  }

  @Get('low-stock')
  @RequiresPermission('products.read')
  @ApiOperation({ summary: 'Productos con stock bajo el umbral de alerta' })
  getLowStock(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getLowStock(user.tenantId);
  }

  @Get('export')
  @RequiresPermission('products.read')
  @ApiOperation({ summary: 'Exportar productos como CSV' })
  async exportCsv(
    @Res() res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const canReadPosition = user.permissions.includes('*') || user.permissions.includes('products.read_position');
    const csv = await this.service.exportCsv(user.tenantId, canReadPosition);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="productos.csv"');
    res.send('\uFEFF' + csv);
  }

  @Post('import')
  @RequiresPermission('products.write')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
    fileFilter: (_req: any, file: any, cb: any) => {
      const allowedMimes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv',
      ];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException(
          `Tipo de archivo no permitido: ${file.mimetype}. Solo se aceptan .xlsx, .xls y .csv`,
        ), false);
      }
    },
  }))
  @ApiOperation({ summary: 'Importar productos desde Excel (.xlsx) o CSV' })
  async importExcel(
    @UploadedFile() file: Express.Multer.File,
    @Query('tenantId') tenantIdQuery: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('No se recibió archivo');
    let effectiveTenantId: number | null = user.tenantId;
    if (user.userType === 'super_admin') {
      if (!tenantIdQuery) {
        throw new BadRequestException('Como super_admin debe indicar la organización (tenantId) destino del import');
      }
      effectiveTenantId = Number(tenantIdQuery);
    }
    return this.service.importFromExcel(file.buffer, user.id, effectiveTenantId);
  }

  @Get('ref/:ref')
  @RequiresPermission('products.read')
  @ApiOperation({ summary: 'Buscar producto por referencia' })
  findByRef(
    @Param('ref') ref: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findByRef(ref, this.ctx(user));
  }

  @Get(':id')
  @RequiresPermission('products.read')
  @ApiOperation({ summary: 'Detalle de producto' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findOne(id, this.ctx(user));
  }

  @Post()
  @RequiresPermission('products.write')
  @ApiOperation({ summary: 'Crear producto' })
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, this.ctx(user));
  }

  @Patch(':id')
  @RequiresPermission('products.write')
  @ApiOperation({ summary: 'Actualizar producto' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<UpdateProductDto>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, this.ctx(user));
  }

  @Delete(':id')
  @RequiresPermission('products.delete')
  @ApiOperation({ summary: 'Desactivar producto' })
  deactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.deactivate(id, this.ctx(user));
  }

  @Get(':id/image')
  @RequiresPermission('products.read')
  @ApiOperation({ summary: 'Obtener imagen del producto' })
  async getImage(
    @Param('id', ParseIntPipe) id: number,
    @Query('thumb') thumb: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const { image, fullPath } = await this.imagesService.get(id, thumb === '1' || thumb === 'true', this.ctx(user));
    res.setHeader('Content-Type', image.mimeType);
    res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
    res.sendFile(fullPath);
  }

  @Post(':id/image')
  @RequiresPermission('products.write')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  @ApiOperation({ summary: 'Subir/reemplazar imagen del producto (máx 10MB)' })
  async uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('No se recibió archivo');
    return this.imagesService.upload(id, file.buffer, file.mimetype, this.ctx(user));
  }

  @Delete(':id/image')
  @RequiresPermission('products.write')
  @ApiOperation({ summary: 'Eliminar imagen del producto' })
  async deleteImage(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.imagesService.remove(id, this.ctx(user));
    return { ok: true };
  }
}
