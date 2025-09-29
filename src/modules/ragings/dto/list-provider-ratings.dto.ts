import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { ListDto } from './list.dto';

export class ListProviderRatingsDto extends ListDto {
  @ApiPropertyOptional({ description: 'Filtrar por ID de request', example: 11 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  requestId?: number;
}
