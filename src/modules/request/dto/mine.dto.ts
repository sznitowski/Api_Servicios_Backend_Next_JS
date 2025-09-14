import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum RequestStatus {
  PENDING = 'PENDING',
  OFFERED = 'OFFERED',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

export class MineQueryDto {
  @ApiPropertyOptional({ description: 'Vista', enum: ['client', 'provider'], example: 'client' })
  @IsOptional()
  @IsIn(['client', 'provider'])
  as?: 'client' | 'provider';

  @ApiPropertyOptional({ description: 'Filtrar por estado', enum: RequestStatus })
  @IsOptional()
  @IsIn(Object.values(RequestStatus))
  status?: RequestStatus;

  @ApiPropertyOptional({ description: 'Página', example: 1, minimum: 1, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Resultados por página', example: 10, minimum: 1, maximum: 100, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
