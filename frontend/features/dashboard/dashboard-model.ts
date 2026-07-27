import type { ServiceOrderListItemResponse, ServiceOrderStatus } from '@oficina/contracts';

const STATUS_PRIORITY: Partial<Record<ServiceOrderStatus, number>> = {
  WAITING_PARTS: 0,
  AWAITING_APPROVAL: 1,
  OPEN: 2,
  IN_PROGRESS: 3,
  COMPLETED: 4,
};

export function prioritizeOperationalOrders(
  items: ServiceOrderListItemResponse[],
  now = new Date(),
): ServiceOrderListItemResponse[] {
  return items
    .filter((item) => !['DELIVERED', 'CANCELLED'].includes(item.status))
    .sort((left, right) => {
      const leftOverdue = left.expectedDeliveryAt && new Date(left.expectedDeliveryAt) < now ? 0 : 1;
      const rightOverdue = right.expectedDeliveryAt && new Date(right.expectedDeliveryAt) < now ? 0 : 1;
      if (leftOverdue !== rightOverdue) return leftOverdue - rightOverdue;

      const statusDelta = (STATUS_PRIORITY[left.status] ?? 99) - (STATUS_PRIORITY[right.status] ?? 99);
      if (statusDelta !== 0) return statusDelta;
      return new Date(left.openedAt).getTime() - new Date(right.openedAt).getTime();
    });
}

export function todayRange(now = new Date()): { startsAt: string; endsAt: string } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}
