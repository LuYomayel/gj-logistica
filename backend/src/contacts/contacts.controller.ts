import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ContactsService, UpdateContactDto } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('contacts')
@ApiBearerAuth()
@Controller('contacts')
export class ContactsController {
  constructor(private readonly service: ContactsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar contactos' })
  @ApiQuery({ name: 'search', required: false })
  findAll(@Query('search') search?: string) {
    return this.service.findAll(search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de contacto' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('comercial', 'comunicacion', 'admin')
  @ApiOperation({ summary: 'Crear contacto' })
  create(@Body() dto: CreateContactDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('comercial', 'comunicacion', 'admin')
  @ApiOperation({ summary: 'Actualizar contacto' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<UpdateContactDto>,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Desactivar contacto' })
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.deactivate(id);
  }
}
