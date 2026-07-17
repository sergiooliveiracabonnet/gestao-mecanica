import type { ServiceOrderStatusHistoryItemResponse } from '@oficina/contracts';
import { SERVICE_ORDER_STATUS_LABELS } from '../state-machine';

interface StatusHistoryTimelineProps {
  history: ServiceOrderStatusHistoryItemResponse[];
}

export function StatusHistoryTimeline({ history }: StatusHistoryTimelineProps) {
  if (history.length === 0) {
    return <p className="text-sm text-text-muted">Sem histórico ainda.</p>;
  }

  return (
    <ol className="flex flex-col gap-3">
      {history.map((item) => (
        <li key={item.id} className="flex items-start gap-3 border-l-2 border-border pl-3">
          <div>
            <p className="text-sm font-medium text-text">
              {item.fromStatus ? `${SERVICE_ORDER_STATUS_LABELS[item.fromStatus]} → ` : ''}
              {SERVICE_ORDER_STATUS_LABELS[item.toStatus]}
            </p>
            <p className="text-xs text-text-muted">{new Date(item.changedAt).toLocaleString('pt-BR')}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
