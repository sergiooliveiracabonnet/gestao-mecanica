'use client';

import type { CustomerListItemResponse } from '@oficina/contracts';
import { ServiceOrdersTable } from '@/features/service-orders/components/ServiceOrdersTable';
import { useServiceOrdersList } from '@/features/service-orders/hooks/use-service-orders';

const HISTORY_PAGE_SIZE = 20;

interface CustomerHistoryTabProps {
  customer?: CustomerListItemResponse;
}

export function CustomerHistoryTab({ customer }: CustomerHistoryTabProps) {
  const { data, isLoading, isError, refetch } = useServiceOrdersList(
    { customerId: customer?.id ?? '', offset: 0, limit: HISTORY_PAGE_SIZE },
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
    <ServiceOrdersTable
      items={data?.items ?? []}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      emptyMessage="Nenhuma ordem de serviço ainda para este cliente."
    />
  );
}
