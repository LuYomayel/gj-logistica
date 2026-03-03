import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ThirdPartiesService, UpdateThirdPartyDto } from './third-parties.service';
import { CreateThirdPartyDto } from './dto/create-third-party.dto';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('third-parties')
@ApiBearerAuth()
@Controller('third-parties')
export class ThirdPartiesController {
  constructor(private readonly service: ThirdPartiesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar empresas' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle empresa' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('admin', 'comercial', 'comunicacion')
  @ApiOperation({ summary: 'Crear empresa' })
  create(@Body() dto: CreateThirdPartyDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('admin', 'comercial', 'comunicacion')
  @ApiOperation({ summary: 'Actualizar empresa' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<UpdateThirdPartyDto>) {
    return this.service.update(id, dto);
  }

  @Get(':id/sales-reps')
  @ApiOperation({ summary: 'Vendedores asignados a la empresa' })
  getSalesReps(@Param('id', ParseIntPipe) id: number) {
    return this.service.getSalesReps(id);
  }

  @Post(':id/sales-reps')
  @Roles('admin')
  @ApiOperation({ summary: 'Asignar vendedor' })
  addSalesRep(
    @Param('id', ParseIntPipe) id: number,
    @Body('userId', ParseIntPipe) userId: number,
  ) {
    return this.service.addSalesRep(id, userId);
  }

  @Delete(':id/sales-reps/:userId')
  @Roles('admin')
  @ApiOperation({ summary: 'Quitar vendedor' })
  removeSalesRep(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.service.removeSalesRep(id, userId);
  }
}
