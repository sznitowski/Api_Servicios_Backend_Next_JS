  import { Injectable, NotFoundException } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { ServiceType } from './service-type.entity';
  import { Category } from '../categories/category.entity';
  import { CreateServiceTypeDto } from './dto/create-service-type.dto';
  import { UpdateServiceTypeDto } from './dto/update-service-type.dto';

  @Injectable()
  export class ServiceTypesService {
    constructor(
      @InjectRepository(ServiceType) private readonly repo: Repository<ServiceType>,
      @InjectRepository(Category) private readonly catRepo: Repository<Category>,
    ) {}

    findAll() {
      return this.repo.find(); // trae category por eager=true en la entidad
    }

    async findOne(id: number) {
      const st = await this.repo.findOne({ where: { id } });
      if (!st) throw new NotFoundException('Service type not found');
      return st;
    }

    async create(dto: CreateServiceTypeDto) {
      const category = await this.catRepo.findOne({ where: { id: dto.categoryId } });
      if (!category) throw new NotFoundException('Category not found');

      const st = this.repo.create({ name: dto.name, active: dto.active ?? true, category });
      return this.repo.save(st);
    }

    async update(id: number, dto: UpdateServiceTypeDto) {
      const st = await this.findOne(id);

      if (dto.name !== undefined) st.name = dto.name;
      if (dto.active !== undefined) st.active = dto.active;
      if (dto.categoryId !== undefined) {
        const category = await this.catRepo.findOne({ where: { id: dto.categoryId } });
        if (!category) throw new NotFoundException('Category not found');
        st.category = category;
      }

      return this.repo.save(st);
    }

    async remove(id: number) {
      const st = await this.findOne(id);
      await this.repo.remove(st);
      return { ok: true };
    }
  }
