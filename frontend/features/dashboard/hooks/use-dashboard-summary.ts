'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard-api';

export function useDashboardBusinessSummary() {
  return useQuery({
    queryKey: ['dashboard-business-summary'],
    queryFn: dashboardApi.businessSummary,
  });
}
