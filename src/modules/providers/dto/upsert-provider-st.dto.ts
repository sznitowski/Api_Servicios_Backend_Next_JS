import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class UpsertProviderServiceTypeDto {
  @ApiProperty({ type: Number, example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  serviceTypeId!: number;
}
