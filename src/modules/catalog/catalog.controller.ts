import { Controller, Get, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Category } from './categories/category.entity';
import { ServiceType } from './service-types/service-type.entity';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

class ServiceTypesQueryDto {
  @IsOptional() @Type(() => Number) @IsInt()
  categoryId?: number;

  @IsOptional() @IsString() @MaxLength(50)
  q?: string;
}

@Controller('catalog')
export class CatalogController {
  constructor(
    @InjectRepository(Category) private readonly cats: Repository<Category>,
    @InjectRepository(ServiceType) private readonly types: Repository<ServiceType>,
  ) {}

  // GET /catalog/categories -> categorías con sus service types (activos)
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

    return categories.map(c => ({
      id: c.id,
      name: c.name,
      description: (c as any).description ?? null,
      serviceTypes: map.get(c.id) ?? [],
    }));
  }

  // GET /catalog/service-types?categoryId=&q=
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
