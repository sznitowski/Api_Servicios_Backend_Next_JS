// src/modules/request/dto/mine.dto.ts
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export type RequestStatus =
  | 'PENDING'
  | 'OFFERED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'DONE'
  | 'CANCELLED';

export class MineQueryDto {
  @IsIn(['client', 'provider'])
  as!: 'client' | 'provider';

  @IsOptional()
  @IsIn(['PENDING', 'OFFERED', 'ACCEPTED', 'IN_PROGRESS', 'DONE', 'CANCELLED'])
  status?: RequestStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 10;
}
