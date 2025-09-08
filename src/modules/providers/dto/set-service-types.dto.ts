import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';

export class ServiceTypeItemDto {
  @IsNumber()
  serviceTypeId!: number;

  @IsOptional() @IsNumber() @Min(0)
  basePrice?: number;

  @IsOptional() @IsBoolean()
  active?: boolean;
}

export class SetServiceTypesDto {
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true })
  @Type(() => ServiceTypeItemDto)
  items!: ServiceTypeItemDto[];
}
