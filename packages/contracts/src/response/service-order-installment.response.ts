export type ServiceOrderInstallmentStatus = 'PENDING' | 'PAID';

export interface ServiceOrderInstallmentResponse {
  id: string;
  serviceOrderId: string;
  orderNumber?: number;
  customerName?: string;
  vehiclePlate?: string;
  installmentNumber: number;
  installmentCount: number;
  amountCents: number;
  dueAt: string;
  status: ServiceOrderInstallmentStatus;
  paidAt?: string;
  receiptId?: string;
}

export interface DueServiceOrderInstallmentsResponse {
  items: ServiceOrderInstallmentResponse[];
  total: number;
}
