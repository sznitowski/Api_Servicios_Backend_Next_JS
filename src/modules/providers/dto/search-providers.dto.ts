// src/modules/providers/dto/search-providers.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  MinLength,
} from 'class-validator';

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

  /** —— Filtros nuevos —— */

  @ApiPropertyOptional({ example: 4.5, description: 'Mínimo promedio de rating (0–5)' })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ example: 3, description: 'Mínima cantidad de reseñas' })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  minReviews?: number;

  @ApiPropertyOptional({ example: 15000, description: 'Precio base mínimo' })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  minPrice?: number;

  @ApiPropertyOptional({ example: 25000, description: 'Precio base máximo' })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional({ example: true, description: 'Sólo perfiles con foto' })
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  hasPhoto?: boolean;

  @ApiPropertyOptional({
    example: 'plomero',
    description: 'Búsqueda por displayName o nombre de usuario',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  q?: string;

  /** —— Orden, paginado —— */

  @ApiPropertyOptional({ enum: ['distance', 'rating', 'price'], example: 'distance' })
  @IsOptional()
  @IsIn(['distance', 'rating', 'price'])
  sort?: 'distance' | 'rating' | 'price';

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  // Permite buscar por rubro si todavía no cargaste service_types.
  @IsOptional() @Type(() => Number) @IsInt()
  categoryId?: number;

}
