import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Min,
  Max,
  IsNumber,
  IsISO8601,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRequestDto {
  @ApiProperty({
    description: 'ID del tipo de servicio',
    example: 1,
    minimum: 1,
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  serviceTypeId!: number;

  @ApiProperty({
    description: 'Título breve del pedido',
    example: 'Mudanza de departamento',
    minLength: 1, // <- los tests mandan 'x'
    maxLength: 80,
  })
  @IsString()
  @MinLength(1) // <- importante para no romper los e2e
  @MaxLength(80)
  title!: string;

  @ApiPropertyOptional({
    description: 'Descripción del pedido',
    example: 'Traslado de cajas y muebles livianos',
    maxLength: 400,
  })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @ApiPropertyOptional({
    description: 'Dirección o referencia textual',
    example: 'Av. Siempre Viva 742, Piso 3',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiProperty({
    description: 'Latitud',
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
    description: 'Longitud',
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
    description: 'Fecha/hora agendada (ISO 8601)',
    example: '2025-10-01T15:30:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  @ApiPropertyOptional({
    description: 'Precio ofrecido por el cliente (si quiere sugerir)',
    example: 500,
    minimum: 0,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceOffered?: number;
}
