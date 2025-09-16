import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { ServiceRequest } from './request.entity';
import { RequestTransition } from './request-transition.entity';
import { ServiceType } from '../catalog/service-types/service-type.entity';
import { User } from '../users/user.entity';
import { RatingsModule } from '../ragings/ratings.module'; 
import { NotificationsModule } from '../notifications/notifications.module'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceRequest, RequestTransition, ServiceType, User]),
    RatingsModule,
    NotificationsModule
  ],
  controllers: [RequestsController],
  providers: [RequestsService],
  exports: [RequestsService],
  
})
export class RequestsModule {}
