import { Type } from 'class-transformer';
import { IsOptional, IsString, MaxLength, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProviderProfileDto {
  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional() @IsString() @MaxLength(80)
  displayName?: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional() @IsString() @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ maxLength: 400 })
  @IsOptional() @IsString() @MaxLength(400)
  bio?: string;

  @ApiPropertyOptional({ description: 'URL de foto' })
  @IsOptional() @IsString()
  photoUrl?: string;

  // Si tu entidad ProviderProfile los tiene:
  @ApiPropertyOptional({ description: 'Latitud', type: Number, minimum: -90, maximum: 90 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90)
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitud', type: Number, minimum: -180, maximum: 180 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180)
  lng?: number;

  @ApiPropertyOptional({ description: 'Radio de cobertura (km)', type: Number, minimum: 0, maximum: 200 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(200)
  radiusKm?: number;
}
