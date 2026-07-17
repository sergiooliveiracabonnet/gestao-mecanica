'use client';

import { useState } from 'react';
import type { CustomerListItemResponse } from '@oficina/contracts';
import { Button } from '@/components/ui/button';
import { ServiceOrdersTable } from '@/features/service-orders/components/ServiceOrdersTable';
import { useServiceOrdersList } from '@/features/service-orders/hooks/use-service-orders';

const HISTORY_PAGE_SIZE = 20;

interface CustomerHistoryTabProps {
  customer?: CustomerListItemResponse;
}

export function CustomerHistoryTab({ customer }: CustomerHistoryTabProps) {
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isError, refetch } = useServiceOrdersList(
    { customerId: customer?.id ?? '', offset, limit: HISTORY_PAGE_SIZE },
    { enabled: Boolean(customer?.id) },
  );

  if (!customer) {
    return (
      <div className="rounded-card border border-border bg-surface p-8 text-center text-sm text-text-muted">
        Disponível depois de salvar o cliente.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ServiceOrdersTable
        items={data?.items ?? []}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyMessage="Nenhuma ordem de serviço ainda para este cliente."
      />

      {data && data.total > HISTORY_PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-text-muted">
          <span>{data.total} ordens de serviço no total</span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - HISTORY_PAGE_SIZE))}
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!data.hasMore}
              onClick={() => setOffset(offset + HISTORY_PAGE_SIZE)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
