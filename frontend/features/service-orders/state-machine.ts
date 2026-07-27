import type { ServiceOrderStatus } from '@oficina/contracts';

// Cópia da máquina de estados do backend
// (backend/src/modules/service-orders/managers/service-order-state-machine.ts)
// — só pra UX decidir quais botões de transição mostrar. A validação real é
// sempre server-side; duplicação intencional, ver plano ordem-de-servico.md.
export const SERVICE_ORDER_TRANSITIONS: Record<ServiceOrderStatus, ServiceOrderStatus[]> = {
  OPEN: ['AWAITING_APPROVAL', 'IN_PROGRESS', 'CANCELLED'],
  AWAITING_APPROVAL: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_PARTS', 'COMPLETED', 'CANCELLED'],
  WAITING_PARTS: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const SERVICE_ORDER_STATUS_LABELS: Record<ServiceOrderStatus, string> = {
  OPEN: 'Aberta',
  AWAITING_APPROVAL: 'Aguardando aprovação',
  IN_PROGRESS: 'Em andamento',
  WAITING_PARTS: 'Aguardando peças',
  COMPLETED: 'Concluída',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelada',
};

export function canTransitionServiceOrder(fromStatus: ServiceOrderStatus, toStatus: ServiceOrderStatus): boolean {
  return SERVICE_ORDER_TRANSITIONS[fromStatus].includes(toStatus);
}
