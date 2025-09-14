// src/modules/request/dto/open-requests.query.dto.ts
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, Min, Min as MinNum, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class OpenRequestsQueryDto {
  @ApiProperty({ type: Number, example: -34.6, minimum: -90, maximum: 90 })
  @Type(() => Number)
  @IsNumber()
  @MinNum(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ type: Number, example: -58.4, minimum: -180, maximum: 180 })
  @Type(() => Number)
  @IsNumber()
  @MinNum(-180)
  @Max(180)
  lng!: number;

  @ApiPropertyOptional({ type: Number, example: 10, minimum: 0 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  radiusKm?: number;

  @ApiPropertyOptional({ enum: ['distance','createdAt'], example: 'distance' })
  @IsOptional() @IsIn(['distance','createdAt'])
  sort?: 'distance' | 'createdAt';

  @ApiPropertyOptional({ type: Number, example: 1, minimum: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional({ type: Number, example: 20, minimum: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  limit?: number;

  @ApiPropertyOptional({ type: Number, example: 1, minimum: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  serviceTypeId?: number;
}
