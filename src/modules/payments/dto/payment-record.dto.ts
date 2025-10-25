import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentProvider, PaymentStatus } from './payment.enums';

export class PaymentRecordDto {
  @ApiProperty() id!: number;

  @ApiProperty({ enum: PaymentProvider }) provider!: PaymentProvider;

  @ApiProperty({ enum: PaymentMethod }) method!: PaymentMethod;

  @ApiProperty({ enum: PaymentStatus }) status!: PaymentStatus;

  @ApiProperty({ example: 33333.00 }) amount!: number;

  @ApiProperty({ example: 'ARS' }) currency!: string;

  @ApiPropertyOptional() approved_at?: string | null;

  @ApiProperty() created_at!: string;

  @ApiPropertyOptional({ example: '1234567890' })
  external_payment_id?: string | null;

  @ApiPropertyOptional({ example: 'PREF-123' })
  intent_id?: string | null;
}
