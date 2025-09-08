// update-provider-profile.dto.ts
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProviderProfileDto {
  @IsOptional() @IsString() @MaxLength(120)
  displayName?: string;

  @IsOptional() @IsString() @MaxLength(32)
  phone?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value)) // ← convierte "" en undefined
  @IsUrl()
  photoUrl?: string;

  @IsOptional() @IsString()
  bio?: string;
}
