import {
  Controller, Get, Post, Patch, Param, Body, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WarehousesService, UpdateWarehouseDto } from './warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('warehouses')
@ApiBearerAuth()
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly service: WarehousesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar almacenes' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de almacén' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Crear almacén' })
  create(@Body() dto: CreateWarehouseDto, @CurrentUser() user: { id: number }) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar almacén' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<UpdateWarehouseDto>) {
    return this.service.update(id, dto);
  }

  @Get(':id/stock')
  @ApiOperation({ summary: 'Stock actual del almacén por producto' })
  getStock(@Param('id', ParseIntPipe) id: number) {
    return this.service.getStock(id);
  }
}
