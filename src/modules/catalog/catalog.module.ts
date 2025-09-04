import { Module } from '@nestjs/common';
import { CategoriesModule } from './categories/categories.module';
import { ServiceTypesModule } from './service-types/service-types.module';

@Module({
  imports: [CategoriesModule, ServiceTypesModule],
  exports: [CategoriesModule, ServiceTypesModule],
})
export class CatalogModule {}
