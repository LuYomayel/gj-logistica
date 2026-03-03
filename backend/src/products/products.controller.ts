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
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar productos con filtros' })
  findAll(@Query() filter: FilterProductDto) {
    return this.service.findAll(filter);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de productos: popularidad y desglose por rubro' })
  getStats(@Query() filter: ProductStatsDto) {
    return this.service.getStats(filter);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Productos con stock bajo el umbral de alerta' })
  getLowStock() {
    return this.service.getLowStock();
  }

  @Get('export')
  @ApiOperation({ summary: 'Exportar productos como CSV' })
  async exportCsv(@Res() res: Response) {
    const csv = await this.service.exportCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="productos.csv"');
    res.send('\uFEFF' + csv);
  }

  @Post('import')
  @Roles('admin', 'comunicacion')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Importar productos desde Excel (.xlsx) o CSV' })
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('No se recibió archivo');
    return this.service.importFromExcel(file.buffer);
  }

  @Get('ref/:ref')
  @ApiOperation({ summary: 'Buscar producto por referencia' })
  findByRef(@Param('ref') ref: string) {
    return this.service.findByRef(ref);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de producto' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('admin', 'comunicacion')
  @ApiOperation({ summary: 'Crear producto' })
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @Roles('admin', 'comunicacion')
  @ApiOperation({ summary: 'Actualizar producto' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<UpdateProductDto>,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Desactivar producto' })
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.deactivate(id);
  }
}
