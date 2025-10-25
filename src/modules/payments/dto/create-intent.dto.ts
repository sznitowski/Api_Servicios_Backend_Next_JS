import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class CreateIntentDto {
  @ApiProperty({ example: 182, description: 'ID del pedido (service_requests.id)' })
  @IsInt()
  @Min(1)
  requestId!: number;
}
