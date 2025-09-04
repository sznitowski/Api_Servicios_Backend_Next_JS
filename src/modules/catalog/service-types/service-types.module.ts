import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceType } from './service-type.entity';
import { Category } from '../categories/category.entity';
import { ServiceTypesService } from './service-types.service';
import { ServiceTypesController } from './service-types.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceType, Category])], // <- CLAVE
  controllers: [ServiceTypesController],
  providers: [ServiceTypesService],
})
export class ServiceTypesModule {}
