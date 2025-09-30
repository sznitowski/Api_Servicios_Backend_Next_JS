// src/modules/requests/dto/create-request.dto.ts
import { Type } from 'class-transformer';
import {
  IsInt, IsOptional, IsString, MaxLength, MinLength,
  Min, Max, IsNumber, IsISO8601
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRequestDto {
  @ApiProperty({
    description: 'ID del tipo de servicio',
    example: 1,
    minimum: 1,
    type: Number,
  })
  @Type(() => Number) @IsInt() @Min(1)
  serviceTypeId!: number;

  @ApiPropertyOptional({
    description: 'UserId del proveedor al que apunto el pedido. Si se omite, queda abierto.',
    example: 2,
    minimum: 1,
    type: Number,
  })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  providerUserId?: number;

  @ApiProperty({
    description: 'Título breve del pedido',
    example: 'Mudanza de departamento',
    minLength: 1, maxLength: 80,
  })
  @IsString() @MinLength(1) @MaxLength(80)
  title!: string;

  @ApiPropertyOptional({
    description: 'Descripción del pedido',
    example: 'Traslado de cajas y muebles livianos',
    maxLength: 400,
  })
  @IsOptional() @IsString() @MaxLength(400)
  description?: string;

  @ApiPropertyOptional({
    description: 'Dirección o referencia textual',
    example: 'Av. Siempre Viva 742, Piso 3',
    maxLength: 200,
  })
  @IsOptional() @IsString() @MaxLength(200)
  address?: string;

  @ApiProperty({
    description: 'Latitud',
    example: -34.6037,
    minimum: -90,
    maximum: 90,
    type: Number,
  })
  @Type(() => Number) @IsNumber() @Min(-90) @Max(90)
  lat!: number;

  @ApiProperty({
    description: 'Longitud',
    example: -58.3816,
    minimum: -180,
    maximum: 180,
    type: Number,
  })
  @Type(() => Number) @IsNumber() @Min(-180) @Max(180)
  lng!: number;

  @ApiPropertyOptional({
    description: 'Fecha/hora agendada (ISO 8601)',
    example: '2025-10-01T15:30:00.000Z',
  })
  @IsOptional() @IsISO8601()
  scheduledAt?: string;

  @ApiPropertyOptional({
    description: 'Precio ofrecido por el cliente',
    example: 500,
    minimum: 0,
    type: Number,
  })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  priceOffered?: number;
}
