import type { ServiceOrderItemType } from '../response/service-order-item.response';

export interface CreateServiceOrderItemRequest {
  serviceOrderId: string;
  type: ServiceOrderItemType;
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface UpdateServiceOrderItemRequest {
  id: string;
  type?: ServiceOrderItemType;
  description?: string;
  quantity?: number;
  unitPriceCents?: number;
}

export interface DeleteServiceOrderItemRequest {
  id: string;
}
