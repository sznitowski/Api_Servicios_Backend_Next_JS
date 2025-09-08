// src/modules/providers/dto/search-providers.dto.ts
import { IsNumber, IsIn, IsOptional, Min, Max, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchProvidersDto {
  @Type(() => Number) @IsNumber() @IsPositive()
  serviceTypeId: number;

  @Type(() => Number) @IsNumber() lat: number;
  @Type(() => Number) @IsNumber() lng: number;

  @Type(() => Number) @IsNumber() @IsOptional() @Min(1) @Max(50)
  limit?: number = 20;

  @Type(() => Number) @IsNumber() @IsOptional() @Min(1)
  page?: number = 1;

  @Type(() => Number) @IsNumber() @IsOptional() @Min(1) @Max(50)
  radiusKm?: number = 10;

  @IsOptional() @IsIn(['distance', 'rating', 'price'])
  sort?: 'distance' | 'rating' | 'price' = 'distance';
}
