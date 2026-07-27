'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MaintenanceAlertListRequest, ResolveMaintenanceAlertRequest } from '@oficina/contracts';
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MAINTENANCE_ALERTS_LIST_KEY] });
    },
  });
}
