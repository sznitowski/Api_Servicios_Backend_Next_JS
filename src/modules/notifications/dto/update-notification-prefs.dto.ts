// src/modules/notifications/dto/update-notification-prefs.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateNotificationPrefsDto {
  @ApiPropertyOptional({
    description: 'Tipos deshabilitados (por ejemplo: OFFERED, ACCEPTED, IN_PROGRESS, DONE, CANCELLED, ADMIN_CANCEL)',
    type: [String],
    example: ['OFFERED', 'CANCELLED'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  disabledTypes?: string[];
}
