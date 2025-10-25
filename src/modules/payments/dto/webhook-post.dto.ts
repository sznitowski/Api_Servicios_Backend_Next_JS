import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class WebhookDataDto {
  @ApiProperty({ example: '1234567890' })
  id!: string;
}

export class WebhookPostDto {
  @ApiProperty({ example: 'payment', description: 'Tipo de evento' })
  type!: string;

  @ApiPropertyOptional({ example: 'payment.updated' })
  action?: string;

  @ApiProperty({ type: WebhookDataDto })
  data!: WebhookDataDto;
}
