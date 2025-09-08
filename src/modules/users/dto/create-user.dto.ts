// src/modules/users/dto/create-address.dto.ts
import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateAddressDto {
  @IsOptional() @IsString() @MaxLength(64)
  label?: string;

  @IsString()
  address!: string;

  @IsOptional()
  @Transform(({ value }) => value === '' || value == null ? undefined : Number(value))
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Transform(({ value }) => value === '' || value == null ? undefined : Number(value))
  @IsNumber()
  lng?: number;

  @IsOptional() @IsBoolean()
  isDefault?: boolean;
}
