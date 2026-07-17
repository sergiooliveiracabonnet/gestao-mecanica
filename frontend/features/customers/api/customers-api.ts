import { apiClient } from '@/lib/api/client';
import type {
  CreateCustomerRequest,
  CustomerListItemResponse,
  CustomerListRequest,
  CustomerResponse,
  DeleteCustomerRequest,
  PaginationData,
  UpdateCustomerRequest,
} from '@oficina/contracts';

export const customersApi = {
  async create(request: CreateCustomerRequest): Promise<{ customer: CustomerResponse }> {
    const response = await apiClient.post<{ customer: CustomerResponse }>('/api/v1/customers', request);
    return response.data;
  },

  async update(request: UpdateCustomerRequest): Promise<{ customer: CustomerResponse }> {
    const response = await apiClient.post<{ customer: CustomerResponse }>('/api/v1/customers/update', request);
    return response.data;
  },

  async delete(request: DeleteCustomerRequest): Promise<{ customer: CustomerResponse }> {
    const response = await apiClient.post<{ customer: CustomerResponse }>('/api/v1/customers/delete', request);
    return response.data;
  },

  async get(id: string): Promise<{ customer: CustomerResponse }> {
    const response = await apiClient.get<{ customer: CustomerResponse }>('/api/v1/customer', { params: { id } });
    return response.data;
  },

  async list(request: CustomerListRequest): Promise<PaginationData<CustomerListItemResponse>> {
    const response = await apiClient.post<PaginationData<CustomerListItemResponse>>('/api/v1/customers/list', request);
    return response.data;
  },
};
