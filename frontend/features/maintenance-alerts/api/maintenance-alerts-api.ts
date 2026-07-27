import { apiClient } from '@/lib/api/client';
import type {
  MaintenanceAlertListItemResponse,
  MaintenanceAlertListRequest,
  MaintenanceAlertResponse,
  PaginationData,
  ResolveMaintenanceAlertRequest,
} from '@oficina/contracts';

export const maintenanceAlertsApi = {
  async list(request: MaintenanceAlertListRequest): Promise<PaginationData<MaintenanceAlertListItemResponse>> {
    const response = await apiClient.post<PaginationData<MaintenanceAlertListItemResponse>>('/api/v1/maintenance-alerts/list', request);
    return response.data;
  },

  async resolve(request: ResolveMaintenanceAlertRequest): Promise<{ alert: MaintenanceAlertResponse }> {
    const response = await apiClient.post<{ alert: MaintenanceAlertResponse }>('/api/v1/maintenance-alerts/resolve', request);
    return response.data;
  },
};
