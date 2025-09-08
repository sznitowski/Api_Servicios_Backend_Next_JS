// src/modules/request/dto/create-request.dto.ts
import { IsNumber, IsOptional, IsString, MaxLength, Min, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRequestDto {
  @Type(() => Number) @IsNumber() @IsPositive()
  serviceTypeId: number;

  @IsOptional() @IsString() @MaxLength(120)
  title?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @IsOptional() @IsString() @MaxLength(240)
  address?: string;

  @Type(() => Number) @IsNumber()
  lat: number;

  @Type(() => Number) @IsNumber()
  lng: number;

  @Type(() => Number) @IsOptional() @Min(0)
  priceOffered?: number;

  @IsOptional() @IsString()
  scheduledAt?: string;
}
