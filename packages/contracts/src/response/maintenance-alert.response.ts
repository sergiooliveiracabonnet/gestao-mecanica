export const MAINTENANCE_ALERT_STATUSES = ['OPEN', 'RESOLVED'] as const;

export type MaintenanceAlertStatus = (typeof MAINTENANCE_ALERT_STATUSES)[number];

// Campos denormalizados (vehicleBrand/Model/Plate, customerName) — mesmo
// padrão flat de ServiceOrderResponse, nunca objeto aninhado.
export interface MaintenanceAlertResponse {
  id: string;
  tenantId: string;
  vehicleId: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehiclePlate: string;
  customerId: string;
  customerName: string;
  referenceDate: string;
  monthsOverdue: number;
  status: MaintenanceAlertStatus;
  resolvedAt?: string;
  resolvedBy?: string;
}

export type MaintenanceAlertListItemResponse = MaintenanceAlertResponse;
