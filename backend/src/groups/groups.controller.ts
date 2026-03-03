import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GroupsService, UpdateGroupDto } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar grupos' })
  findAll() {
    return this.groupsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de grupo' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.groupsService.findOne(id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Crear grupo' })
  create(@Body() dto: CreateGroupDto) {
    return this.groupsService.create(dto);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar grupo' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<UpdateGroupDto>) {
    return this.groupsService.update(id, dto);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Miembros del grupo' })
  getMembers(@Param('id', ParseIntPipe) id: number) {
    return this.groupsService.getMembers(id);
  }

  @Post(':id/members')
  @Roles('admin')
  @ApiOperation({ summary: 'Agregar usuario al grupo' })
  addMember(
    @Param('id', ParseIntPipe) id: number,
    @Body('userId', ParseIntPipe) userId: number,
  ) {
    return this.groupsService.addMember(id, userId);
  }

  @Delete(':id/members/:userId')
  @Roles('admin')
  @ApiOperation({ summary: 'Quitar usuario del grupo' })
  removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.groupsService.removeMember(id, userId);
  }
}
