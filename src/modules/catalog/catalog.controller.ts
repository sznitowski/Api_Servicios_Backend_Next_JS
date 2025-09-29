// src/modules/catalog/catalog.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Category } from './categories/category.entity';
import { ServiceType } from './service-types/service-type.entity';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';

class ServiceTypesQueryDto {
  @IsOptional() @Type(() => Number) @IsInt()
  categoryId?: number;

  @IsOptional() @IsString() @MaxLength(50)
  q?: string;
}

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(
    @InjectRepository(Category) private readonly cats: Repository<Category>,
    @InjectRepository(ServiceType) private readonly types: Repository<ServiceType>,
  ) {}

  // GET /catalog/categories -> categorías con sus service types (activos)
  @ApiOperation({
    summary: 'Listar categorías',
    description: 'Devuelve categorías activas con sus service types activos.',
  })
  @ApiOkResponse({
    description: 'OK',
    schema: {
      example: [
        {
          id: 1,
          name: 'General',
          description: null,
          serviceTypes: [{ id: 1, name: 'Mudanza' }, { id: 2, name: 'Plomería' }],
        },
      ],
    },
  })
  @Public()
  @Get('categories')
  async categories() {
    const categories = await this.cats.find({
      where: { active: true },
      order: { name: 'ASC' },
    });

    const allTypes = await this.types.find({
      where: { active: true },
      relations: { category: true },
      order: { name: 'ASC' },
    });

    const map = new Map<number, { id: number; name: string }[]>();
    for (const t of allTypes) {
      const cid = t.category?.id!;
      if (!map.has(cid)) map.set(cid, []);
      map.get(cid)!.push({ id: t.id, name: t.name });
    }

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: (c as any).description ?? null,
      serviceTypes: map.get(c.id) ?? [],
    }));
  }

  // GET /catalog/service-types?categoryId=&q=
  @ApiOperation({
    summary: 'Listar tipos de servicio',
    description: 'Lista de service types activos. Permite filtrar por categoría y por texto.',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: Number,
    description: 'Filtra por categoría (id).',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    type: String,
    description: 'Búsqueda por nombre (ILIKE %q%).',
    maxLength: 50,
  })
  @ApiOkResponse({
    description: 'OK',
    schema: {
      example: [
        { id: 1, name: 'Mudanza', active: true, category: { id: 1, name: 'General' } },
        { id: 3, name: 'Plomería', active: true, category: { id: 2, name: 'Hogar' } },
      ],
    },
  })
  @Public()
  @Get('service-types')
  async serviceTypes(@Query() q: ServiceTypesQueryDto) {
    const where: any = { active: true };
    if (q.categoryId) where.category = { id: q.categoryId };
    if (q.q) where.name = ILike(`%${q.q}%`);

    return this.types.find({
      where,
      relations: { category: true },
      select: {
        id: true,
        name: true,
        active: true,
        category: { id: true, name: true },
      },
      order: { name: 'ASC' },
    });
  }
}
