import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { NotificationPreferences } from './notification-preferences.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationStreamService } from './notification-stream.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationPreferences]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationStreamService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
