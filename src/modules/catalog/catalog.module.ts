import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './categories/category.entity';
import { ServiceType } from './service-types/service-type.entity';
import { CatalogController } from './catalog.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Category, ServiceType])],
  controllers: [CatalogController],
})
export class CatalogModule {}
