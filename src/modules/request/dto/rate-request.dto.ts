// src/modules/requests/dto/rate-request.dto.ts
import { Type } from 'class-transformer';
import { IsInt, Max, Min, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RateRequestDto {
  @ApiProperty({ description: 'Puntaje 1-5', example: 5, minimum: 1, maximum: 5, type: Number })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  stars!: number;

  @ApiPropertyOptional({ description: 'Comentario opcional', example: 'Excelente servicio', maxLength: 400 })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  comment?: string;
}
