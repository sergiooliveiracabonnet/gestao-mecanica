import { IsBoolean, IsIn, IsInt, IsISO8601, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { PAYMENT_METHODS } from '@oficina/contracts';
import type {
  ConfigureServiceOrderPaymentRequest,
  ConfirmServiceOrderInstallmentRequest,
  ListDueServiceOrderInstallmentsRequest,
} from '@oficina/contracts';

export class ConfigureServiceOrderPaymentDto implements ConfigureServiceOrderPaymentRequest {
  @IsUUID() serviceOrderId!: string;
  @IsIn(PAYMENT_METHODS) method!: ConfigureServiceOrderPaymentRequest['method'];
  @IsInt() @Min(1) @Max(24) installments!: number;
  @IsBoolean() anticipated!: boolean;
  @IsOptional() @IsISO8601() firstDueAt?: string;
}

export class ConfirmServiceOrderInstallmentDto implements ConfirmServiceOrderInstallmentRequest {
  @IsUUID() id!: string;
}

export class ListDueServiceOrderInstallmentsDto implements ListDueServiceOrderInstallmentsRequest {
  @IsOptional() @IsInt() @Min(1) @Max(100) limit: number = 20;
}
