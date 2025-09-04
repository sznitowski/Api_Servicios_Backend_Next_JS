// src/modules/request/requests.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { ServiceRequest } from './request.entity';
import { RequestTransition } from './request-transition.entity';
import { ServiceType } from '../catalog/service-types/service-type.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceRequest, RequestTransition, ServiceType, User])],
  controllers: [RequestsController],
  providers: [RequestsService],
})
export class RequestsModule {}
