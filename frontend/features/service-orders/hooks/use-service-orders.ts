'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateServiceOrderRequest,
  DeleteServiceOrderRequest,
  ServiceOrderListRequest,
  TransitionServiceOrderRequest,
  UpdateServiceOrderRequest,
} from '@oficina/contracts';
import { serviceOrdersApi } from '../api/service-orders-api';

const SERVICE_ORDERS_LIST_KEY = 'service-orders-list';
const SERVICE_ORDER_KEY = 'service-order';

export function useServiceOrdersList(request: ServiceOrderListRequest) {
  return useQuery({
    queryKey: [SERVICE_ORDERS_LIST_KEY, request],
    queryFn: () => serviceOrdersApi.list(request),
    placeholderData: (previousData) => previousData,
  });
}

export function useServiceOrder(id: string) {
  return useQuery({
    queryKey: [SERVICE_ORDER_KEY, id],
    queryFn: () => serviceOrdersApi.get(id),
    enabled: Boolean(id),
  });
}

export function useCreateServiceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateServiceOrderRequest) => serviceOrdersApi.create(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SERVICE_ORDERS_LIST_KEY] });
    },
  });
}

export function useUpdateServiceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateServiceOrderRequest) => serviceOrdersApi.update(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [SERVICE_ORDERS_LIST_KEY] });
      queryClient.invalidateQueries({ queryKey: [SERVICE_ORDER_KEY, data.serviceOrder.id] });
    },
  });
}

export function useTransitionServiceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: TransitionServiceOrderRequest) => serviceOrdersApi.transition(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [SERVICE_ORDERS_LIST_KEY] });
      queryClient.invalidateQueries({ queryKey: [SERVICE_ORDER_KEY, data.serviceOrder.id] });
    },
  });
}

export function useDeleteServiceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: DeleteServiceOrderRequest) => serviceOrdersApi.delete(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SERVICE_ORDERS_LIST_KEY] });
    },
  });
}
