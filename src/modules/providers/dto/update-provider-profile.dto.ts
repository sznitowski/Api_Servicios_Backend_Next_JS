// src/modules/providers/dto/update-provider-profile.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateProviderProfileDto {
  @ApiPropertyOptional({ maxLength: 80, nullable: true })
  @IsOptional() @IsString() @MaxLength(80)
  displayName?: string | null;

  @ApiPropertyOptional({ maxLength: 30, nullable: true })
  @IsOptional() @IsString() @MaxLength(30)
  phone?: string | null;

  @ApiPropertyOptional({ maxLength: 400, nullable: true })
  @IsOptional() @IsString() @MaxLength(400)
  bio?: string | null;

  @ApiPropertyOptional({ description: 'URL de foto', nullable: true })
  @IsOptional() @IsString()
  photoUrl?: string | null;

  @ApiPropertyOptional({ description: 'Latitud', type: Number, minimum: -90, maximum: 90, nullable: true })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90)
  lat?: number | null;

  @ApiPropertyOptional({ description: 'Longitud', type: Number, minimum: -180, maximum: 180, nullable: true })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180)
  lng?: number | null;

  @ApiPropertyOptional({ description: 'Radio de cobertura (km)', type: Number, minimum: 0, maximum: 200, nullable: true })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(200)
  radiusKm?: number | null;
}
