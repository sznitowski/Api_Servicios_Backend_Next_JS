// src/modules/request/dto/feed.dto.ts
import { Type } from 'class-transformer';
import { IsNumber, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FeedQueryDto {
  @ApiProperty({
    description: 'Latitud actual',
    example: -34.6037,
    minimum: -90,
    maximum: 90,
    type: Number,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({
    description: 'Longitud actual',
    example: -58.3816,
    minimum: -180,
    maximum: 180,
    type: Number,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  lng!: number;

  @ApiPropertyOptional({
    description: 'Radio de búsqueda (km)',
    example: 10,
    minimum: 1,
    maximum: 100,
    type: Number,
    default: 10, // documentado; si no viene, el service puede usar 10
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(100)
  radiusKm?: number;
}
