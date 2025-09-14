import { Type } from 'class-transformer';
import { IsOptional, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class OfferDto {
  @ApiPropertyOptional({
    description: 'Precio ofrecido por el proveedor',
    example: 700,
    minimum: 0,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceOffered?: number;
}

export class AcceptDto {
  @ApiPropertyOptional({
    description: 'Precio acordado por el cliente',
    example: 650,
    minimum: 0,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceAgreed?: number;
}
