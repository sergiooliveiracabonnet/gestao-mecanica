import type { PaymentMethod } from '../response/service-order-receipt.response';

export interface ConfirmServiceOrderReceiptRequest {
  serviceOrderId: string;
  method: PaymentMethod;
  amountCents: number;
  receivedAt?: string;
  notes?: string;
}

export interface DeleteServiceOrderReceiptRequest {
  id: string;
}
