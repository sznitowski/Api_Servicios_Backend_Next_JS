import { IsString, IsOptional, IsNumber, IsDateString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRequestDto {
  // a qué tipo de servicio pertenece el pedido
  @Type(() => Number)
  @IsInt()
  serviceTypeId: number;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  // Oferta inicial del cliente (opcional). En la entidad se guarda como string (decimal)
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceOffered?: number;
}
