import { IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class OfferDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceOffered?: number;
}

export class AcceptDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceAgreed?: number;
}
