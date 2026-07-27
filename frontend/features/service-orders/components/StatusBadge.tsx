import type { ServiceOrderStatus } from '@oficina/contracts';
import { Badge } from '@/components/ui/badge';
import { SERVICE_ORDER_STATUS_LABELS } from '../state-machine';

type OperationalVariant = 'neutral' | 'info' | 'attention' | 'success' | 'critical';

// O estágio continua explícito no texto; a cor comunica a condição
// operacional compartilhada pelo sistema (neutra, em curso, atenção etc.).
const STATUS_VARIANTS: Record<ServiceOrderStatus, OperationalVariant> = {
  OPEN: 'neutral',
  IN_PROGRESS: 'info',
  WAITING_PARTS: 'attention',
  COMPLETED: 'success',
  DELIVERED: 'success',
  CANCELLED: 'critical',
};

interface StatusBadgeProps {
  status: ServiceOrderStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant={STATUS_VARIANTS[status]}>{SERVICE_ORDER_STATUS_LABELS[status]}</Badge>;
}
