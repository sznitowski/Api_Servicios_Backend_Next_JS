// src/modules/users/dto/update-address.dto.ts
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAddressDto {
  @ApiPropertyOptional({ maxLength: 60 }) @IsOptional() @IsString() @MaxLength(60)
  label?: string;

  @ApiPropertyOptional({ maxLength: 200 }) @IsOptional() @IsString() @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({ minimum: -90, maximum: 90, type: Number })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90)
  lat?: number;

  @ApiPropertyOptional({ minimum: -180, maximum: 180, type: Number })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180)
  lng?: number;

  @ApiPropertyOptional({ maxLength: 200 }) @IsOptional() @IsString() @MaxLength(200)
  notes?: string;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional() @Type(() => Boolean) @IsBoolean()
  isDefault?: boolean;
}
