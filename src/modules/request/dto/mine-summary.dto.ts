import { IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MineSummaryDto {
  @ApiPropertyOptional({ description: 'Vista', enum: ['client', 'provider'], example: 'client' })
  @IsOptional()
  @IsIn(['client', 'provider'])
  as?: 'client' | 'provider';
}
