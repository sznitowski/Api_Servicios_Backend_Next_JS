import { ApiProperty } from '@nestjs/swagger';

export class CreateIntentResDto {
  @ApiProperty({ example: 'PREF-123' })
  id!: string;

  @ApiProperty({ example: 'https://www.mercadopago.com/init' })
  init_point?: string;

  @ApiProperty({ example: 'https://sandbox.mercadopago.com/init' })
  sandbox_init_point?: string;
}
