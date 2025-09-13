// src/modules/request/dto/create-request.dto.ts
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  IsDateString,
} from 'class-validator';

export class CreateRequestDto {
  @IsInt()
  serviceTypeId: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  address?: string;

  // lat en [-90, 90]
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(-90)
  @Max(90)
  lat: number;

  // lng en [-180, 180]
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(-180)
  @Max(180)
  lng: number;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsInt()
  @Min(1)
  priceOffered: number;
}
