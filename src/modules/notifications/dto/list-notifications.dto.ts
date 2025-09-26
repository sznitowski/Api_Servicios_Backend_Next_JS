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

  // Permitir pasar el JWT por query (?access_token=...) para evitar 400 del ValidationPipe
  @ApiPropertyOptional({
    description: 'JWT por query (útil para SSE/cURL cuando no podés setear headers)',
    type: String,
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsOptional()
  access_token?: string;
}
