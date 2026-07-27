import type { PaymentMethod } from '../response/service-order-receipt.response';

export interface ConfigureServiceOrderPaymentRequest {
  serviceOrderId: string;
  method: PaymentMethod;
  installments: number;
  anticipated: boolean;
  firstDueAt?: string;
}

export interface ConfirmServiceOrderInstallmentRequest {
  id: string;
}

export interface ListDueServiceOrderInstallmentsRequest {
  limit?: number;
}
