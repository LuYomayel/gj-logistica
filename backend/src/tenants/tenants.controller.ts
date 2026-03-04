import {
  Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { RequiresPermission } from '../common/decorators/requires-permission.decorator';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @RequiresPermission('tenants.read')
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @RequiresPermission('tenants.read')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.findOne(id);
  }

  @Post()
  @RequiresPermission('tenants.write')
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Patch(':id')
  @RequiresPermission('tenants.write')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(id, dto);
  }

  @Delete(':id')
  @RequiresPermission('tenants.write')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.deactivate(id);
  }

  @Patch(':id/activate')
  @RequiresPermission('tenants.write')
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.activate(id);
  }

  @Get(':id/users')
  @RequiresPermission('tenants.read')
  findUsers(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.findUsers(id);
  }
}
