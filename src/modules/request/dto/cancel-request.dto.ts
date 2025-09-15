// src/modules/request/dto/cancel-request.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelRequestDto {
  @ApiPropertyOptional({ description: 'Motivo de la cancelación', maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
