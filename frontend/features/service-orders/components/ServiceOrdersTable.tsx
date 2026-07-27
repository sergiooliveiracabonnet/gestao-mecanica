'use client';

import Link from 'next/link';
import type { ServiceOrderListItemResponse } from '@oficina/contracts';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrencyBRL } from '@/lib/format-currency';
import { StatusBadge } from './StatusBadge';

interface ServiceOrdersTableProps {
  items: ServiceOrderListItemResponse[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  emptyMessage?: string;
}

export function ServiceOrdersTable({
  items,
  isLoading,
  isError,
  onRetry,
  emptyMessage = 'Nenhuma ordem de serviço ainda. Cadastre a primeira clicando em "Nova OS".',
}: ServiceOrdersTableProps) {
  if (isLoading) {
    return (
      <div role="status" aria-label="Carregando ordens de serviço" className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-12 animate-pulse rounded-card bg-surface" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-danger/30 bg-danger/5 p-8 text-center">
        <p className="text-sm text-danger">Não foi possível carregar as ordens de serviço.</p>
        <Button variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-card border border-border bg-surface p-8 text-center text-sm text-text-muted">{emptyMessage}</div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Veículo</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Técnico</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Abertura</TableHead>
            <TableHead>Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((serviceOrder) => (
            <TableRow key={serviceOrder.id} className="cursor-pointer">
              <TableCell className="p-0">
                <Link href={`/service-orders/${serviceOrder.id}`} className="block px-4 py-2 font-medium text-text">
                  {serviceOrder.vehicleBrand} {serviceOrder.vehicleModel} · {serviceOrder.vehiclePlate}
                </Link>
              </TableCell>
              <TableCell className="text-text-muted">{serviceOrder.customerName}</TableCell>
              <TableCell className="text-text-muted">{serviceOrder.technicianName ?? '—'}</TableCell>
              <TableCell>
                <StatusBadge status={serviceOrder.status} />
              </TableCell>
              <TableCell className="text-text-muted">{new Date(serviceOrder.openedAt).toLocaleDateString('pt-BR')}</TableCell>
              <TableCell className="font-medium text-text">{formatCurrencyBRL(serviceOrder.totalAmountCents)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
