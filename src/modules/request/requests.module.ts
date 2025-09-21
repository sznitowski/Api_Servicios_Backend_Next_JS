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
import { RequestMessage } from './request-message.entity';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';

// requests.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceRequest,
      RequestTransition,
      ServiceType,
      User,
      RequestMessage, // <-- está
    ]),
    RatingsModule,
    NotificationsModule,
  ],
  controllers: [RequestsController, MessagesController],
  providers: [RequestsService, MessagesService],
  exports: [RequestsService, MessagesService],
})
export class RequestsModule {}

