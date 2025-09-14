// src/modules/providers/dto/set-service-types.dto.ts
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';

export class ServiceTypeItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  serviceTypeId: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  basePrice?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class SetServiceTypesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceTypeItemDto)
  items: ServiceTypeItemDto[];
}
