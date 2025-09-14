// src/modules/request/dto/list-requests.query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export const REQUEST_STATUS = [
  'PENDING',
  'OFFERED',
  'ACCEPTED',
  'IN_PROGRESS',
  'DONE',
  'CANCELLED',
] as const;

export type RequestStatus = (typeof REQUEST_STATUS)[number];

export class ListRequestsQueryDto {
  @ApiPropertyOptional({
    description: 'Filtra por estado del request',
    enum: REQUEST_STATUS,
  })
  @IsOptional()
  @IsIn(REQUEST_STATUS as unknown as string[])
  status?: RequestStatus;

  @ApiPropertyOptional({ description: 'Página', type: Number, example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Tamaño de página',
    type: Number,
    example: 20,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
