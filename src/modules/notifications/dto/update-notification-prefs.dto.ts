// src/modules/notifications/dto/update-notification-prefs.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayUnique, IsEnum } from 'class-validator';
import { NotificationType } from '../notification.entity';

export class UpdateNotificationPrefsDto {
  @ApiProperty({
    description: 'Tipos de notificación a deshabilitar',
    isArray: true,
    enum: NotificationType,
    example: ['OFFERED', 'DONE'],
  })
  @IsArray()
  @ArrayUnique()
  @IsEnum(NotificationType, { each: true })
  disabledTypes!: NotificationType[];
}
