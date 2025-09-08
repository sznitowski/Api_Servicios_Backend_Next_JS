import { IsIn, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class SearchProvidersDto {
  @IsInt()
  serviceTypeId: number;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional() @IsNumber() @Min(0)
  radiusKm?: number; // default 10

  @IsOptional() @IsInt() @Min(1)
  page?: number; // default 1

  @IsOptional() @IsInt() @Min(1)
  limit?: number; // default 20

  @IsOptional() @IsIn(['distance', 'rating', 'price'])
  sort?: 'distance' | 'rating' | 'price'; // default distance
}
