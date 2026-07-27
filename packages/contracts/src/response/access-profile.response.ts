export const PERMISSION_KEYS = [
  'dashboard.view', 'finance.view', 'finance.manage',
  'service_orders.view', 'service_orders.manage', 'service_orders.prices',
  'receipts.manage',
  'appointments.view', 'appointments.manage',
  'customers.view', 'customers.manage',
  'vehicles.view', 'vehicles.manage',
  'alerts.view', 'alerts.manage',
  'team.view', 'team.manage', 'profiles.manage',
  'settings.view', 'settings.manage',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export interface AccessProfileResponse {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions: PermissionKey[];
  userCount: number;
}
