// src/modules/notifications/dto/list-notifications.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class ListNotificationsDto {
  @ApiPropertyOptional({ description: 'Sólo no leídas', type: Boolean, example: true })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true') // evita Boolean("false") => true
  @IsBoolean()
  unseen?: boolean;

  @ApiPropertyOptional({ description: 'Página', type: Number, example: 1, minimum: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: 'Tamaño de página', type: Number, example: 20, minimum: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  limit: number = 20;
}
