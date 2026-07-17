// Ordem dos estados reflete a máquina de estados da spec — ver
// SERVICE_ORDER_TRANSITIONS no backend (service-order-state-machine.ts) e a
// cópia usada só pra UX no frontend (state-machine.ts).
export const SERVICE_ORDER_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_PARTS',
  'COMPLETED',
  'DELIVERED',
  'CANCELLED',
] as const;

export type ServiceOrderStatus = (typeof SERVICE_ORDER_STATUSES)[number];

export interface ServiceOrderStatusHistoryItemResponse {
  id: string;
  fromStatus: ServiceOrderStatus | null;
  toStatus: ServiceOrderStatus;
  changedBy: string;
  changedAt: string;
}

export interface ServiceOrderResponse {
  id: string;
  tenantId: string;
  customerId: string;
  // Denormalizado pelo Manager, mesmo padrão de VehicleResponse.customerName.
  customerName: string;
  vehicleId: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehiclePlate: string;
  status: ServiceOrderStatus;
  checklist?: Record<string, unknown>;
  diagnosis?: string;
  technicianId?: string;
  technicianName?: string;
  openedAt: string;
  closedAt?: string;
  createdAt: string;
  // Só populado por getById — ver spec: list não precisa do histórico
  // completo, só a linha atual.
  statusHistory?: ServiceOrderStatusHistoryItemResponse[];
}

export type ServiceOrderListItemResponse = ServiceOrderResponse;
