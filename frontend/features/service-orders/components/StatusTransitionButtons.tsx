'use client';

import { toast } from 'sonner';
import type { ServiceOrderStatus } from '@oficina/contracts';
import { Button } from '@/components/ui/button';
import { extractErrorMessage } from '@/lib/api/client';
import { useTransitionServiceOrder } from '../hooks/use-service-orders';
import { SERVICE_ORDER_STATUS_LABELS, SERVICE_ORDER_TRANSITIONS } from '../state-machine';

interface StatusTransitionButtonsProps {
  serviceOrderId: string;
  status: ServiceOrderStatus;
}

export function StatusTransitionButtons({ serviceOrderId, status }: StatusTransitionButtonsProps) {
  const transition = useTransitionServiceOrder();
  const targets = SERVICE_ORDER_TRANSITIONS[status];

  if (targets.length === 0) {
    return null;
  }

  function handleTransition(toStatus: ServiceOrderStatus) {
    transition.mutate(
      { id: serviceOrderId, toStatus },
      {
        onSuccess: () => toast.success(`Status atualizado para ${SERVICE_ORDER_STATUS_LABELS[toStatus]}.`),
        onError: (error) => toast.error(extractErrorMessage(error)),
      },
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {targets.map((toStatus) => (
        <Button
          key={toStatus}
          variant={toStatus === 'CANCELLED' ? 'destructive' : 'default'}
          size="sm"
          disabled={transition.isPending}
          onClick={() => handleTransition(toStatus)}
        >
          {SERVICE_ORDER_STATUS_LABELS[toStatus]}
        </Button>
      ))}
    </div>
  );
}
