import type { ServiceOrderStatus } from '@oficina/contracts';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SERVICE_ORDER_STATUS_LABELS } from '../state-machine';

// Cada status tem uma cor própria — evita a antiga ambiguidade de dois
// estados (Em andamento/Aguardando peças, Concluída/Entregue) reaproveitando
// a mesma cor e obrigando o usuário a ler o texto pra diferenciar.
const STATUS_COLORS: Record<ServiceOrderStatus, string> = {
  OPEN: 'border-transparent bg-info/10 text-info',
  IN_PROGRESS: 'border-transparent bg-primary/10 text-primary',
  WAITING_PARTS: 'border-transparent bg-warning/10 text-warning',
  COMPLETED: 'border-transparent bg-teal-600/10 text-teal-700 dark:text-teal-400',
  DELIVERED: 'border-transparent bg-success/10 text-success',
  CANCELLED: 'border-transparent bg-danger/10 text-danger',
};

interface StatusBadgeProps {
  status: ServiceOrderStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge className={cn(STATUS_COLORS[status])}>{SERVICE_ORDER_STATUS_LABELS[status]}</Badge>;
}
