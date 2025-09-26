import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { NotificationPreferences } from './notification-preferences.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationStreamService } from './notification-stream.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtOrQueryGuard } from '../../common/guards/jwt-or-query.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, NotificationPreferences])],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationStreamService,
    JwtAuthGuard,
    JwtOrQueryGuard,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
