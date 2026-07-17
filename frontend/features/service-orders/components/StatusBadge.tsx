import type { ServiceOrderStatus } from '@oficina/contracts';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SERVICE_ORDER_STATUS_LABELS } from '../state-machine';

const STATUS_COLORS: Record<ServiceOrderStatus, string> = {
  OPEN: 'border-transparent bg-primary/10 text-primary',
  IN_PROGRESS: 'border-transparent bg-warning/10 text-warning',
  WAITING_PARTS: 'border-transparent bg-warning/10 text-warning',
  COMPLETED: 'border-transparent bg-success/10 text-success',
  DELIVERED: 'border-transparent bg-success/10 text-success',
  CANCELLED: 'border-transparent bg-danger/10 text-danger',
};

interface StatusBadgeProps {
  status: ServiceOrderStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge className={cn(STATUS_COLORS[status])}>{SERVICE_ORDER_STATUS_LABELS[status]}</Badge>;
}
