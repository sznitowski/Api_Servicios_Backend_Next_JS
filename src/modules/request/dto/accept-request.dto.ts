// src/modules/requests/dto/accept-request.dto.ts
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AcceptRequestDto {
  @ApiPropertyOptional({
    description: 'Precio acordado al aceptar (opcional)',
    example: 1500,
    minimum: 0,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceAgreed?: number;
}
