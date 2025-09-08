// src/modules/ratings/dto/create-rating.dto.ts
import { IsInt, Min, Max, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRatingDto {
  @IsInt() @Min(1) @Max(5)
  stars: number;

  @IsOptional() @IsString() @MaxLength(800)
  comment?: string;
}
