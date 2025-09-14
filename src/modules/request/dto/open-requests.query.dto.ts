import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class OpenRequestsQueryDto {
  @ApiPropertyOptional({ type: Number, example: 1, minimum: 1 })
  @IsOptional() @IsInt() @Min(1)
  serviceTypeId?: number;

  @ApiPropertyOptional({ type: Number, example: -34.6 })
  @IsOptional() @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ type: Number, example: -58.4 })
  @IsOptional() @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ type: Number, example: 10, minimum: 0 })
  @IsOptional() @IsNumber() @Min(0)
  radiusKm?: number;

  @ApiPropertyOptional({ enum: ['distance','createdAt'], example: 'distance' })
  @IsOptional() @IsIn(['distance','createdAt'])
  sort?: 'distance' | 'createdAt';

  @ApiPropertyOptional({ type: Number, example: 1, minimum: 1 })
  @IsOptional() @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional({ type: Number, example: 10, minimum: 1 })
  @IsOptional() @IsInt() @Min(1)
  limit?: number;
}
