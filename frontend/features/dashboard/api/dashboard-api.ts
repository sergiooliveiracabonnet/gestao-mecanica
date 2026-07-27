import type { DashboardBusinessSummaryResponse } from '@oficina/contracts';
import { apiClient } from '@/lib/api/client';

export const dashboardApi = {
  async businessSummary(): Promise<DashboardBusinessSummaryResponse> {
    return (await apiClient.get<DashboardBusinessSummaryResponse>('/api/v1/dashboard/business-summary')).data;
  },
};
