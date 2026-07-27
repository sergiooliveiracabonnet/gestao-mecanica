import type { ServiceOrderStatus } from '@oficina/contracts';

// Máquina de estados da spec (ordem-de-servico.md). DELIVERED e CANCELLED
// são estados finais — nenhuma transição sai deles.
export const SERVICE_ORDER_TRANSITIONS: Record<ServiceOrderStatus, ServiceOrderStatus[]> = {
  OPEN: ['AWAITING_APPROVAL', 'IN_PROGRESS', 'CANCELLED'],
  AWAITING_APPROVAL: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_PARTS', 'COMPLETED', 'CANCELLED'],
  WAITING_PARTS: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const SERVICE_ORDER_CLOSING_STATUSES: ServiceOrderStatus[] = ['DELIVERED', 'CANCELLED'];
