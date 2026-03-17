import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ThirdPartiesService, UpdateThirdPartyDto } from './third-parties.service';
import { CreateThirdPartyDto } from './dto/create-third-party.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequiresPermission } from '../common/decorators/requires-permission.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@ApiTags('third-parties')
@ApiBearerAuth()
@Controller('third-parties')
export class ThirdPartiesController {
  constructor(private readonly service: ThirdPartiesService) {}

  @Get()
  @RequiresPermission('third_parties.read')
  @ApiOperation({ summary: 'Listar empresas' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findAll(user.tenantId);
  }

  @Get(':id')
  @RequiresPermission('third_parties.read')
  @ApiOperation({ summary: 'Detalle empresa' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findOne(id, user.tenantId);
  }

  @Post()
  @RequiresPermission('third_parties.write')
  @ApiOperation({ summary: 'Crear empresa' })
  create(
    @Body() dto: CreateThirdPartyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user.tenantId);
  }

  @Patch(':id')
  @RequiresPermission('third_parties.write')
  @ApiOperation({ summary: 'Actualizar empresa' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<UpdateThirdPartyDto>) {
    return this.service.update(id, dto);
  }

  @Get(':id/sales-reps')
  @RequiresPermission('third_parties.read')
  @ApiOperation({ summary: 'Vendedores asignados a la empresa' })
  getSalesReps(@Param('id', ParseIntPipe) id: number) {
    return this.service.getSalesReps(id);
  }

  @Post(':id/sales-reps')
  @RequiresPermission('third_parties.write')
  @ApiOperation({ summary: 'Asignar vendedor' })
  addSalesRep(
    @Param('id', ParseIntPipe) id: number,
    @Body('userId', ParseIntPipe) userId: number,
  ) {
    return this.service.addSalesRep(id, userId);
  }

  @Delete(':id/sales-reps/:userId')
  @RequiresPermission('third_parties.write')
  @ApiOperation({ summary: 'Quitar vendedor' })
  removeSalesRep(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.service.removeSalesRep(id, userId);
  }
}
