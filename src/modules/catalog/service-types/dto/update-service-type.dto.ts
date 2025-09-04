import { IsBoolean, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateServiceTypeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  categoryId?: number;
}
