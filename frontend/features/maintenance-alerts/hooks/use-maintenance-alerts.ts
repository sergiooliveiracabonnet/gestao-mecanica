'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  MaintenanceAlertListItemResponse,
  MaintenanceAlertListRequest,
  PaginationData,
  ResolveMaintenanceAlertRequest,
} from '@oficina/contracts';
import { maintenanceAlertsApi } from '../api/maintenance-alerts-api';

const MAINTENANCE_ALERTS_LIST_KEY = 'maintenance-alerts-list';

export function useMaintenanceAlertsList(request: MaintenanceAlertListRequest) {
  return useQuery({
    queryKey: [MAINTENANCE_ALERTS_LIST_KEY, request],
    queryFn: () => maintenanceAlertsApi.list(request),
    placeholderData: (previousData) => previousData,
  });
}

export function useResolveMaintenanceAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ResolveMaintenanceAlertRequest) => maintenanceAlertsApi.resolve(request),
    onSuccess: (_data, variables) => {
      // Atualização otimista (FRONTEND.md § Optimistic Updates): remove a
      // linha da lista cacheada imediatamente, sem esperar um refetch
      // completo. Cobre qualquer request cacheado (ex: filtro de status
      // default OPEN), não só a página atual.
      queryClient.setQueriesData<PaginationData<MaintenanceAlertListItemResponse>>(
        { queryKey: [MAINTENANCE_ALERTS_LIST_KEY] },
        (old) => {
          if (!old) {
            return old;
          }
          const items = old.items.filter((item) => item.id !== variables.id);
          if (items.length === old.items.length) {
            return old;
          }
          return { ...old, items, total: Math.max(0, old.total - 1) };
        },
      );
      // Marca outras variações cacheadas (ex: aba "Resolvidos") como stale
      // sem disparar refetch imediato — consistência eventual sem flash.
      queryClient.invalidateQueries({ queryKey: [MAINTENANCE_ALERTS_LIST_KEY], refetchType: 'none' });
    },
  });
}
