import { IsBoolean, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateServiceTypeDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean = true;

  @IsInt()
  categoryId: number;
}
