'use client';

import { useState } from 'react';
import type { ServiceOrderStatus } from '@oficina/contracts';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ServiceOrderFormModal } from '@/features/service-orders/components/ServiceOrderFormModal';
import { ServiceOrdersTable } from '@/features/service-orders/components/ServiceOrdersTable';
import { useServiceOrdersList } from '@/features/service-orders/hooks/use-service-orders';
import { SERVICE_ORDER_STATUS_LABELS } from '@/features/service-orders/state-machine';

const PAGE_SIZE = 20;
const ALL_STATUSES = Object.keys(SERVICE_ORDER_STATUS_LABELS) as ServiceOrderStatus[];

export default function ServiceOrdersPage() {
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState<ServiceOrderStatus | 'ALL'>('ALL');
  const [formModalOpen, setFormModalOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useServiceOrdersList({
    offset,
    limit: PAGE_SIZE,
    status: status === 'ALL' ? undefined : status,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as ServiceOrderStatus | 'ALL');
            setOffset(0);
          }}
        >
          <SelectTrigger className="w-full sm:max-w-xs">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os status</SelectItem>
            {ALL_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {SERVICE_ORDER_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setFormModalOpen(true)}>Nova OS</Button>
      </div>

      <ServiceOrdersTable items={data?.items ?? []} isLoading={isLoading} isError={isError} onRetry={refetch} />

      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-text-muted">
          <span>{data.total} ordens de serviço no total</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={!data.hasMore} onClick={() => setOffset(offset + PAGE_SIZE)}>
              Próxima
            </Button>
          </div>
        </div>
      )}

      <ServiceOrderFormModal open={formModalOpen} onOpenChange={setFormModalOpen} />
    </div>
  );
}
