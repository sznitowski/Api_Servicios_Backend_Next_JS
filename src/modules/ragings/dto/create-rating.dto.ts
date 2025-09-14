import { Type } from 'class-transformer';
import { IsInt, Min, Max, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRatingDto {
  @ApiProperty({ description: 'Puntaje (1 a 5)', example: 5, minimum: 1, maximum: 5, type: Number })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  stars!: number;

  @ApiPropertyOptional({ description: 'Comentario del cliente', example: 'Excelente servicio', maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  comment?: string;
}
