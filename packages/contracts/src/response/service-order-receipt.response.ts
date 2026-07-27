export const PAYMENT_METHODS = ['PIX', 'CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'BANK_TRANSFER', 'BOLETO', 'OTHER'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type PaymentStatus = 'AWAITING_PAYMENT' | 'PARTIALLY_PAID' | 'PAID';

export interface ServiceOrderReceiptResponse {
  id: string;
  serviceOrderId: string;
  method: PaymentMethod;
  amountCents: number;
  receivedAt: string;
  confirmedBy: string;
  notes?: string;
}
