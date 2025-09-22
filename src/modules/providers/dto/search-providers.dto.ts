// src/modules/providers/dto/search-providers.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class SearchProvidersDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  serviceTypeId!: number;

  @ApiProperty({ example: -34.6 })
  @Type(() => Number)
  @IsNumber()
  lat!: number;

  @ApiProperty({ example: -58.4 })
  @Type(() => Number)
  @IsNumber()
  lng!: number;

  @ApiPropertyOptional({ example: 10 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  radiusKm?: number;

  @ApiPropertyOptional({ enum: ['distance', 'rating', 'price'], example: 'distance' })
  @IsOptional()
  @IsIn(['distance', 'rating', 'price'])
  sort?: 'distance' | 'rating' | 'price';

  // NUEVO: filtro por rating mínimo (1..5)
  @ApiPropertyOptional({ example: 4, description: 'Filtrar por calificación promedio mínima (1-5)' })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
