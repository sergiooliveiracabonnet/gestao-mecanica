import { apiClient } from '@/lib/api/client';
import type {
  CreateServiceOrderItemRequest,
  DeleteServiceOrderItemRequest,
  ServiceOrderItemResponse,
  UpdateServiceOrderItemRequest,
} from '@oficina/contracts';

export const serviceOrderItemsApi = {
  async create(request: CreateServiceOrderItemRequest): Promise<{ item: ServiceOrderItemResponse }> {
    const response = await apiClient.post<{ item: ServiceOrderItemResponse }>('/api/v1/service-orders/items', request);
    return response.data;
  },

  async update(request: UpdateServiceOrderItemRequest): Promise<{ item: ServiceOrderItemResponse }> {
    const response = await apiClient.post<{ item: ServiceOrderItemResponse }>('/api/v1/service-orders/items/update', request);
    return response.data;
  },

  async delete(request: DeleteServiceOrderItemRequest): Promise<{ item: ServiceOrderItemResponse }> {
    const response = await apiClient.post<{ item: ServiceOrderItemResponse }>('/api/v1/service-orders/items/delete', request);
    return response.data;
  },
};
