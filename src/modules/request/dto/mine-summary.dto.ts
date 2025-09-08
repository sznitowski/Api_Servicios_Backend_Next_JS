// src/modules/request/dto/mine-summary.dto.ts
import { IsIn } from 'class-validator';

export class MineSummaryDto {
  @IsIn(['client', 'provider'])
  as!: 'client' | 'provider';
}
