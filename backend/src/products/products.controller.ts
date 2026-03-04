import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, ParseIntPipe,
  Res, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService, UpdateProductDto } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { FilterProductDto, ProductStatsDto } from './dto/filter-product.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequiresPermission } from '../common/decorators/requires-permission.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  @RequiresPermission('products.read')
  @ApiOperation({ summary: 'Listar productos con filtros' })
  findAll(
    @Query() filter: FilterProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findAll(filter, user.tenantId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de productos: popularidad y desglose por rubro' })
  getStats(
    @Query() filter: ProductStatsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getStats(filter, user.tenantId);
  }

  @Get('low-stock')
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
    const csv = await this.service.exportCsv(user.tenantId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="productos.csv"');
    res.send('\uFEFF' + csv);
  }

  @Post('import')
  @RequiresPermission('products.write')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Importar productos desde Excel (.xlsx) o CSV' })
  async importExcel(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new Error('No se recibió archivo');
    return this.service.importFromExcel(file.buffer, user.id, user.tenantId);
  }

  @Get('ref/:ref')
  @ApiOperation({ summary: 'Buscar producto por referencia' })
  findByRef(@Param('ref') ref: string) {
    return this.service.findByRef(ref);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de producto' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findOne(id, user.tenantId);
  }

  @Post()
  @RequiresPermission('products.write')
  @ApiOperation({ summary: 'Crear producto' })
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user.id, user.tenantId);
  }

  @Patch(':id')
  @RequiresPermission('products.write')
  @ApiOperation({ summary: 'Actualizar producto' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<UpdateProductDto>,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequiresPermission('products.delete')
  @ApiOperation({ summary: 'Desactivar producto' })
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.deactivate(id);
  }
}
