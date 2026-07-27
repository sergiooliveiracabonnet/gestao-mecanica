'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateServiceOrderItemRequest, DeleteServiceOrderItemRequest, UpdateServiceOrderItemRequest } from '@oficina/contracts';
import { serviceOrderItemsApi } from '../api/service-order-items-api';

const SERVICE_ORDER_KEY = 'service-order';
const SERVICE_ORDERS_LIST_KEY = 'service-orders-list';

// Todas as 3 mutações invalidam a mesma query key de useServiceOrder (pra
// recarregar items/totalAmountCents) e a lista (pra atualizar a coluna
// "Valor" da ServiceOrdersTable), mesmo padrão de useUpdateServiceOrder.
export function useAddServiceOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateServiceOrderItemRequest) => serviceOrderItemsApi.create(request),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [SERVICE_ORDER_KEY, variables.serviceOrderId] });
      queryClient.invalidateQueries({ queryKey: [SERVICE_ORDERS_LIST_KEY] });
    },
  });
}

export function useUpdateServiceOrderItem(serviceOrderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateServiceOrderItemRequest) => serviceOrderItemsApi.update(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SERVICE_ORDER_KEY, serviceOrderId] });
      queryClient.invalidateQueries({ queryKey: [SERVICE_ORDERS_LIST_KEY] });
    },
  });
}

export function useDeleteServiceOrderItem(serviceOrderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: DeleteServiceOrderItemRequest) => serviceOrderItemsApi.delete(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SERVICE_ORDER_KEY, serviceOrderId] });
      queryClient.invalidateQueries({ queryKey: [SERVICE_ORDERS_LIST_KEY] });
    },
  });
}
