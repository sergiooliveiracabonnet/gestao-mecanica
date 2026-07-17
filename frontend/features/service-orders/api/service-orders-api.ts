import { apiClient } from '@/lib/api/client';
import type {
  CreateServiceOrderRequest,
  DeleteServiceOrderRequest,
  PaginationData,
  ServiceOrderListItemResponse,
  ServiceOrderListRequest,
  ServiceOrderResponse,
  TransitionServiceOrderRequest,
  UpdateServiceOrderRequest,
} from '@oficina/contracts';

export const serviceOrdersApi = {
  async create(request: CreateServiceOrderRequest): Promise<{ serviceOrder: ServiceOrderResponse }> {
    const response = await apiClient.post<{ serviceOrder: ServiceOrderResponse }>('/api/v1/service-orders', request);
    return response.data;
  },

  async update(request: UpdateServiceOrderRequest): Promise<{ serviceOrder: ServiceOrderResponse }> {
    const response = await apiClient.post<{ serviceOrder: ServiceOrderResponse }>('/api/v1/service-orders/update', request);
    return response.data;
  },

  async transition(request: TransitionServiceOrderRequest): Promise<{ serviceOrder: ServiceOrderResponse }> {
    const response = await apiClient.post<{ serviceOrder: ServiceOrderResponse }>('/api/v1/service-orders/transition', request);
    return response.data;
  },

  async delete(request: DeleteServiceOrderRequest): Promise<{ serviceOrder: ServiceOrderResponse }> {
    const response = await apiClient.post<{ serviceOrder: ServiceOrderResponse }>('/api/v1/service-orders/delete', request);
    return response.data;
  },

  async get(id: string): Promise<{ serviceOrder: ServiceOrderResponse }> {
    const response = await apiClient.get<{ serviceOrder: ServiceOrderResponse }>('/api/v1/service-order', { params: { id } });
    return response.data;
  },

  async list(request: ServiceOrderListRequest): Promise<PaginationData<ServiceOrderListItemResponse>> {
    const response = await apiClient.post<PaginationData<ServiceOrderListItemResponse>>('/api/v1/service-orders/list', request);
    return response.data;
  },
};
