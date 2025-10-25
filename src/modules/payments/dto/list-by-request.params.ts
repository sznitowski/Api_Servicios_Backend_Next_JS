import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class ListByRequestParamsDto {
  @ApiProperty({ example: 182 })
  @IsInt()
  @Min(1)
  id!: number;
}
