import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ServiceTypesService } from './service-types.service';
import { CreateServiceTypeDto } from './dto/create-service-type.dto';

import { UpdateServiceTypeDto } from './dto/update-service-type.dto';

@Controller('service-types')
export class ServiceTypesController {
  constructor(private readonly service: ServiceTypesService) {}

  @Get()
  list() {
    return this.service.findAll();
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: CreateServiceTypeDto) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateServiceTypeDto) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
