import { ApiProperty } from '@nestjs/swagger';

export enum PaymentProvider {
  MP = 'MP',
  STRIPE = 'STRIPE',
  TRANSFER = 'TRANSFER',
  CASH = 'CASH',
  DEBIT_AUTOMATIC = 'DEBIT_AUTOMATIC',
  OTHER = 'OTHER',
}

export enum PaymentMethod {
  CARD = 'card',
  DEBIT_CARD = 'debit_card',
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
  ACCOUNT_BALANCE = 'account_balance',
  DIRECT_DEBIT = 'direct_debit',
  OTHER = 'other',
}

export enum PaymentStatus {
  CREATED = 'CREATED',
  PENDING = 'PENDING',
  IN_PROCESS = 'IN_PROCESS',
  APPROVED = 'APPROVED',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum RequestAggregatedPayment {
  NONE = 'NONE',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}
