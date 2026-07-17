import type { PageableRequest } from '../response/pagination.response';
import type { ServiceOrderStatus } from '../response/service-order.response';

export interface CreateServiceOrderRequest {
  vehicleId: string;
  technicianId?: string;
  checklist?: Record<string, unknown>;
  diagnosis?: string;
}

export interface UpdateServiceOrderRequest {
  id: string;
  technicianId?: string;
  checklist?: Record<string, unknown>;
  diagnosis?: string;
}

export interface TransitionServiceOrderRequest {
  id: string;
  toStatus: ServiceOrderStatus;
}

export interface DeleteServiceOrderRequest {
  id: string;
}

export interface ServiceOrderListRequest extends PageableRequest {
  status?: ServiceOrderStatus;
  vehicleId?: string;
  technicianId?: string;
  // Feature 6 (Cadastro de Cliente Expandido) — aba Histórico do cliente.
  customerId?: string;
}
