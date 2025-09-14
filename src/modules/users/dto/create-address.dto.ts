// src/modules/users/dto/create-address.dto.ts
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiPropertyOptional({
    description: 'Etiqueta corta para identificar la dirección (ej: Casa, Trabajo)',
    example: 'Casa',
    maxLength: 60,
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string;

  @ApiProperty({
    description: 'Dirección en una sola línea',
    example: 'Av. Siempre Viva 742, Piso 3, Depto B',
    maxLength: 200,
  })
  @IsString()
  @MaxLength(200)
  address!: string;

  @ApiProperty({
    description: 'Latitud en grados decimales',
    example: -34.6037,
    minimum: -90,
    maximum: 90,
    type: Number,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({
    description: 'Longitud en grados decimales',
    example: -58.3816,
    minimum: -180,
    maximum: 180,
    type: Number,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @ApiPropertyOptional({
    description: 'Notas o referencias adicionales',
    example: 'Timbre roto',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Marcar como dirección principal',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDefault?: boolean;
}
