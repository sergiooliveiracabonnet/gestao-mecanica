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
  ConfirmServiceOrderReceiptRequest,
  DeleteServiceOrderReceiptRequest,
  ServiceOrderReceiptResponse,
  ConfigureServiceOrderPaymentRequest,
  ConfirmServiceOrderInstallmentRequest,
  DueServiceOrderInstallmentsResponse,
  ServiceOrderInstallmentResponse,
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
  async confirmReceipt(request: ConfirmServiceOrderReceiptRequest): Promise<{ receipt: ServiceOrderReceiptResponse }> {
    return (await apiClient.post('/api/v1/service-orders/receipts', request)).data;
  },
  async deleteReceipt(request: DeleteServiceOrderReceiptRequest): Promise<{ success: true }> {
    return (await apiClient.post('/api/v1/service-orders/receipts/delete', request)).data;
  },
  async configurePayment(request: ConfigureServiceOrderPaymentRequest): Promise<{ serviceOrder: ServiceOrderResponse }> {
    return (await apiClient.post('/api/v1/service-orders/payment/configure', request)).data;
  },
  async confirmInstallment(request: ConfirmServiceOrderInstallmentRequest): Promise<{ installment: ServiceOrderInstallmentResponse }> {
    return (await apiClient.post('/api/v1/service-orders/installments/confirm', request)).data;
  },
  async dueInstallments(limit = 20): Promise<DueServiceOrderInstallmentsResponse> {
    return (await apiClient.post('/api/v1/service-orders/installments/due', { limit })).data;
  },
};
