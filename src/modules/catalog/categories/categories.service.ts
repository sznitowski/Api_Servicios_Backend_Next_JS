import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';

export interface CreateCategoryDto {
  name: string;
  active?: boolean;
}
export interface UpdateCategoryDto {
  name?: string;
  active?: boolean;
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category) private readonly repo: Repository<Category>,
  ) {}

  findAll() {
    return this.repo.find();
  }

  async findOne(id: number) {
    const cat = await this.repo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async create(dto: CreateCategoryDto) {
    const cat = this.repo.create({ name: dto.name, active: dto.active ?? true });
    return this.repo.save(cat);
  }

  async update(id: number, dto: UpdateCategoryDto) {
    const cat = await this.findOne(id);
    if (dto.name !== undefined) cat.name = dto.name;
    if (dto.active !== undefined) cat.active = dto.active;
    return this.repo.save(cat);
  }

  async remove(id: number) {
    const cat = await this.findOne(id);
    await this.repo.remove(cat);
    return { ok: true };
  }
}
