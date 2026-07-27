'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { LayoutGrid, List, Search, SlidersHorizontal, X } from 'lucide-react';
import type { ServiceOrderListItemResponse, ServiceOrderStatus } from '@oficina/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ServiceOrderBoard } from '@/features/service-orders/components/ServiceOrderBoard';
import { ServiceOrdersTable } from '@/features/service-orders/components/ServiceOrdersTable';
import { useServiceOrdersList } from '@/features/service-orders/hooks/use-service-orders';
import { SERVICE_ORDER_STATUS_LABELS } from '@/features/service-orders/state-machine';

const PAGE_SIZE = 100;
const ALL_STATUSES = Object.keys(SERVICE_ORDER_STATUS_LABELS) as ServiceOrderStatus[];
type ViewMode = 'board' | 'list';

export default function ServiceOrdersPage() {
  const [status, setStatus] = useState<ServiceOrderStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('board');
  const { data, isLoading, isError, refetch } = useServiceOrdersList({ offset: 0, limit: PAGE_SIZE, status: status === 'ALL' ? undefined : status });

  const filteredItems = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase('pt-BR');
    if (!normalized) return data?.items ?? [];
    return (data?.items ?? []).filter((item) => [item.vehicleBrand, item.vehicleModel, item.vehiclePlate, item.customerName, item.technicianName].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(normalized));
  }, [data?.items, search]);

  const hasFilters = Boolean(search || status !== 'ALL');
  const clearFilters = () => { setSearch(''); setStatus('ALL'); };

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-4 rounded-card border border-border bg-card p-4 shadow-sm sm:p-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0"><p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-primary">Fluxo da oficina</p><h2 className="text-2xl font-bold tracking-tight text-text">Ordens de serviço</h2><p className="mt-1 text-sm text-text-muted">Encontre um veículo, veja o gargalo e avance o próximo passo.</p></div>
        <Button asChild className="shrink-0"><Link href="/service-orders/new">Novo atendimento</Link></Button>
      </section>

      <section aria-label="Filtros das ordens de serviço" className="flex flex-col gap-3 rounded-card border border-border bg-surface p-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" aria-hidden="true" /><Input aria-label="Buscar ordens de serviço" placeholder="Buscar por placa, veículo, cliente ou técnico" value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 pl-9" />{search && <button type="button" aria-label="Limpar busca" onClick={() => setSearch('')} className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-button text-text-muted hover:bg-muted hover:text-text"><X className="size-4" aria-hidden="true" /></button>}</div>
        <Select value={status} onValueChange={(value) => setStatus(value as ServiceOrderStatus | 'ALL')}><SelectTrigger aria-label="Filtrar por status" className="w-full sm:w-52"><SlidersHorizontal className="mr-2 size-4 text-text-muted" aria-hidden="true" /><SelectValue placeholder="Todos os status" /></SelectTrigger><SelectContent><SelectItem value="ALL">Todos os status</SelectItem>{ALL_STATUSES.map((value) => <SelectItem key={value} value={value}>{SERVICE_ORDER_STATUS_LABELS[value]}</SelectItem>)}</SelectContent></Select>
        <div className="flex items-center gap-1 rounded-button border border-border bg-background p-1" role="group" aria-label="Modo de visualização"><button type="button" aria-label="Visualizar quadro" aria-pressed={view === 'board'} onClick={() => setView('board')} className={`flex size-8 items-center justify-center rounded-sm ${view === 'board' ? 'bg-selection text-primary' : 'text-text-muted hover:text-text'}`}><LayoutGrid className="size-4" aria-hidden="true" /></button><button type="button" aria-label="Visualizar lista" aria-pressed={view === 'list'} onClick={() => setView('list')} className={`flex size-8 items-center justify-center rounded-sm ${view === 'list' ? 'bg-selection text-primary' : 'text-text-muted hover:text-text'}`}><List className="size-4" aria-hidden="true" /></button></div>
      </section>

      <div className="flex items-center justify-between gap-3"><p className="text-sm text-text-muted"><span className="font-semibold text-text">{isLoading ? '—' : filteredItems.length}</span> {filteredItems.length === 1 ? 'ordem encontrada' : 'ordens encontradas'}{hasFilters && <span> com filtros ativos</span>}</p>{hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="text-text-muted">Limpar filtros<X className="size-3.5" aria-hidden="true" /></Button>}</div>

      {view === 'board' ? <ServiceOrderBoard items={filteredItems} isLoading={isLoading} isError={isError} onRetry={refetch} /> : <ServiceOrdersTable items={filteredItems} isLoading={isLoading} isError={isError} onRetry={refetch} emptyMessage={hasFilters ? 'Nenhuma ordem corresponde aos filtros.' : undefined} />}
      {data && data.total > PAGE_SIZE && <div className="flex items-center justify-between text-sm text-text-muted"><span>Mostrando as primeiras {PAGE_SIZE} de {data.total} ordens</span></div>}
    </div>
  );
}
