import { IsIn, IsInt, IsISO8601, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { PAYMENT_METHODS } from '@oficina/contracts';
import type { ConfirmServiceOrderReceiptRequest, DeleteServiceOrderReceiptRequest } from '@oficina/contracts';

export class ConfirmServiceOrderReceiptDto implements ConfirmServiceOrderReceiptRequest {
  @IsUUID() serviceOrderId!: string;
  @IsIn(PAYMENT_METHODS) method!: ConfirmServiceOrderReceiptRequest['method'];
  @IsInt() @Min(1) amountCents!: number;
  @IsOptional() @IsISO8601() receivedAt?: string;
  @IsOptional() @IsString() @MaxLength(300) notes?: string;
}

export class DeleteServiceOrderReceiptDto implements DeleteServiceOrderReceiptRequest {
  @IsUUID() id!: string;
}
