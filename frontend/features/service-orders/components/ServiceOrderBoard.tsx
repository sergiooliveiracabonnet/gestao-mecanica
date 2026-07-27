'use client';

import Link from 'next/link';
import { ArrowRight, CarFront, ChevronRight, Clock3, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import type { ServiceOrderListItemResponse, ServiceOrderStatus } from '@oficina/contracts';
import { extractErrorMessage } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from './StatusBadge';
import { useTransitionServiceOrder } from '../hooks/use-service-orders';
import { SERVICE_ORDER_STATUS_LABELS } from '../state-machine';

interface ServiceOrderBoardProps {
  items: ServiceOrderListItemResponse[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

const BOARD_COLUMNS: Array<{ statuses: ServiceOrderStatus[]; label: string; accent: string }> = [
  { statuses: ['OPEN'], label: 'Entrada', accent: 'bg-slate-400' },
  { statuses: ['IN_PROGRESS'], label: 'Em andamento', accent: 'bg-info' },
  { statuses: ['WAITING_PARTS'], label: 'Aguardando peças', accent: 'bg-warning' },
  { statuses: ['COMPLETED'], label: 'Pronto', accent: 'bg-success' },
  { statuses: ['DELIVERED', 'CANCELLED'], label: 'Encerradas', accent: 'bg-slate-500' },
];

const QUICK_NEXT_STATUS: Partial<Record<ServiceOrderStatus, ServiceOrderStatus>> = {
  OPEN: 'IN_PROGRESS',
  IN_PROGRESS: 'COMPLETED',
  WAITING_PARTS: 'IN_PROGRESS',
  COMPLETED: 'DELIVERED',
};

function timeSince(date: string) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 3_600_000));
  if (hours < 1) return 'agora';
  if (hours < 24) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)}d`;
}

export function ServiceOrderBoard({ items, isLoading, isError, onRetry }: ServiceOrderBoardProps) {
  if (isLoading) {
    return <div className="grid gap-4 xl:grid-cols-5">{BOARD_COLUMNS.map((column) => <div key={column.label} className="h-56 animate-pulse rounded-card bg-surface" />)}</div>;
  }

  if (isError) {
    return <div className="rounded-card border border-danger/30 bg-danger-subtle p-10 text-center"><p className="text-sm font-semibold text-danger-strong">Não foi possível carregar o quadro.</p><button type="button" onClick={onRetry} className="mt-4 rounded-button border border-border bg-background px-4 py-2 text-sm font-semibold text-text hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Tentar novamente</button></div>;
  }

  return <div className="grid grid-cols-1 gap-4 pb-2 md:grid-cols-2 xl:grid-cols-5">{BOARD_COLUMNS.map((column) => <BoardColumn key={column.label} column={column} items={items.filter((item) => column.statuses.includes(item.status))} />)}</div>;
}

function BoardColumn({ column, items }: { column: (typeof BOARD_COLUMNS)[number]; items: ServiceOrderListItemResponse[] }) {
  return <section aria-labelledby={`board-${column.label}`} className="min-w-0 rounded-card border border-border bg-surface/70 p-2.5 sm:p-3"><header className="flex items-center justify-between gap-2 px-1 pb-3"><div className="flex min-w-0 items-center gap-2"><span className={`size-2 rounded-full ${column.accent}`} aria-hidden="true" /><h2 id={`board-${column.label}`} className="truncate text-sm font-bold text-text">{column.label}</h2></div><Badge variant="neutral" className="tabular-nums">{items.length}</Badge></header><div className="space-y-2">{items.length === 0 ? <div className="rounded-button border border-dashed border-border px-3 py-6 text-center text-xs text-text-muted">Nenhuma OS aqui</div> : items.map((item) => <BoardCard key={item.id} item={item} />)}</div></section>;
}

function BoardCard({ item }: { item: ServiceOrderListItemResponse }) {
  const transition = useTransitionServiceOrder();
  const nextStatus = QUICK_NEXT_STATUS[item.status] ?? null;

  function advance() {
    if (!nextStatus) return;
    transition.mutate({ id: item.id, toStatus: nextStatus }, {
      onSuccess: () => toast.success(`OS avançada para ${SERVICE_ORDER_STATUS_LABELS[nextStatus]}.`),
      onError: (error) => toast.error(extractErrorMessage(error)),
    });
  }

  return <article className="rounded-button border border-border bg-card p-3 shadow-sm transition-[border-color,box-shadow,transform] duration-fast hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"><Link href={`/service-orders/${item.id}`} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-bold text-text">{item.vehicleBrand} {item.vehicleModel}</p><p className="mt-0.5 font-mono text-[11px] font-semibold tracking-wide text-text-muted">{item.vehiclePlate}</p></div><StatusBadge status={item.status} /></div><div className="mt-3 space-y-1.5 border-t border-border pt-2.5"><div className="flex items-center gap-2 text-xs text-text-muted"><UserRound className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{item.customerName}</span></div><div className="flex items-center gap-2 text-xs text-text-muted"><CarFront className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{item.technicianName ?? 'Sem técnico atribuído'}</span></div></div><div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-text-muted"><span className="flex items-center gap-1"><Clock3 className="size-3.5" aria-hidden="true" />{timeSince(item.openedAt)}</span><span className="flex items-center gap-1">{new Date(item.openedAt).toLocaleDateString('pt-BR')}<ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span></div></Link>{nextStatus ? <button type="button" onClick={advance} disabled={transition.isPending} className="mt-3 flex h-8 w-full items-center justify-center gap-1 rounded-button border border-primary/20 bg-primary-subtle px-2 text-[11px] font-bold text-primary-strong transition-colors hover:bg-primary/15 disabled:cursor-wait disabled:opacity-60">{transition.isPending ? 'Atualizando...' : `Avançar para ${SERVICE_ORDER_STATUS_LABELS[nextStatus]}`}<ChevronRight className="size-3.5" aria-hidden="true" /></button> : null}</article>;
}
