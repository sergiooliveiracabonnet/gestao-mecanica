'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ArrowRight, CheckCircle2, Clock3, Plus, TriangleAlert, Wrench } from 'lucide-react';
import type { ServiceOrderStatus } from '@oficina/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/features/service-orders/components/StatusBadge';
import { SERVICE_ORDER_STATUS_LABELS } from '@/features/service-orders/state-machine';
import { useServiceOrdersList } from '@/features/service-orders/hooks/use-service-orders';
import { useMaintenanceAlertsList } from '@/features/maintenance-alerts/hooks/use-maintenance-alerts';

const STATUSES: ServiceOrderStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'DELIVERED', 'CANCELLED'];
const PRIORITY_ORDER: Partial<Record<ServiceOrderStatus, number>> = {
  WAITING_PARTS: 0,
  OPEN: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
  DELIVERED: 4,
  CANCELLED: 5,
};

export default function DashboardPage() {
  const orders = useServiceOrdersList({ offset: 0, limit: 100 });
  const alerts = useMaintenanceAlertsList({ offset: 0, limit: 6, status: 'OPEN' });
  const items = orders.data?.items ?? [];
  const activeOrders = items.filter((item) => !['DELIVERED', 'CANCELLED'].includes(item.status));
  const waitingApproval = items.filter((item) => item.status === 'OPEN');
  const ready = items.filter((item) => item.status === 'COMPLETED');
  const inProgress = items.filter((item) => item.status === 'IN_PROGRESS');
  const priorityItems = useMemo(() => [...items].sort((left, right) => {
    const statusDelta = (PRIORITY_ORDER[left.status] ?? 99) - (PRIORITY_ORDER[right.status] ?? 99);
    if (statusDelta !== 0) return statusDelta;
    return new Date(left.openedAt).getTime() - new Date(right.openedAt).getTime();
  }), [items]);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-card border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-primary">Resumo de hoje</p>
          <h2 className="max-w-xl text-2xl font-bold tracking-tight text-text sm:text-3xl">Sua oficina em movimento.</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-text-muted">Veja onde estão os veículos e resolva primeiro o que pode travar a operação.</p>
        </div>
        <Button asChild size="lg" className="shrink-0"><Link href="/service-orders/new"><Plus className="size-4" aria-hidden="true" />Novo atendimento</Link></Button>
      </section>

      <section aria-label="Indicadores da oficina" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Em atendimento" value={activeOrders.length} caption="OS abertas agora" icon={Wrench} tone="info" loading={orders.isLoading} />
        <MetricCard label="Em execução" value={inProgress.length} caption="com a equipe" icon={Clock3} tone="primary" loading={orders.isLoading} />
        <MetricCard label="Prontos" value={ready.length} caption="aguardando entrega" icon={CheckCircle2} tone="success" loading={orders.isLoading} />
        <MetricCard label="Alertas abertos" value={alerts.data?.total ?? 0} caption="manutenções preventivas" icon={TriangleAlert} tone="warning" loading={alerts.isLoading} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center justify-between border-b border-border pb-4">
            <div><CardTitle>Prioridades da operação</CardTitle><p className="mt-1 text-sm text-text-muted">Gargalos e veículos mais antigos aparecem primeiro.</p></div>
            <Button asChild variant="ghost" size="sm" className="shrink-0 text-primary"><Link href="/service-orders">Ver todas<ArrowRight className="size-4" aria-hidden="true" /></Link></Button>
          </CardHeader>
          <CardContent className="p-0">
            {orders.isLoading ? <OrderSkeleton /> : orders.isError ? <ErrorBlock action={orders.refetch} /> : priorityItems.length === 0 ? <EmptyBlock /> : <div className="divide-y divide-border">{priorityItems.slice(0, 6).map((item) => <OrderRow key={item.id} item={item} />)}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between"><div><CardTitle>Atalhos da operação</CardTitle><p className="mt-1 text-sm text-text-muted">Acesse o que você mais usa.</p></div></CardHeader>
          <CardContent className="grid gap-2">
            <QuickAction href="/service-orders" label="Abrir quadro de OS" hint={`${activeOrders.length} em atendimento`} icon={Wrench} />
            <QuickAction href="/customers" label="Encontrar cliente" hint="Por nome ou documento" icon={Plus} />
            <QuickAction href="/maintenance-alerts" label="Revisar alertas" hint={`${alerts.data?.total ?? 0} em aberto`} icon={TriangleAlert} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Distribuição das OS</CardTitle><p className="mt-1 text-sm text-text-muted">Onde sua equipe está concentrada.</p></CardHeader><CardContent className="space-y-3">{STATUSES.filter((status) => status !== 'CANCELLED').map((status) => { const count = items.filter((item) => item.status === status).length; const percentage = activeOrders.length ? Math.round((count / activeOrders.length) * 100) : 0; return <div key={status} className="space-y-1.5"><div className="flex items-center justify-between text-sm"><span className="text-text-muted">{SERVICE_ORDER_STATUS_LABELS[status]}</span><span className="font-semibold tabular-nums text-text">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-normal" style={{ width: `${Math.min(percentage, 100)}%` }} /></div></div>; })}</CardContent></Card>
        <Card><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Alertas de manutenção</CardTitle><p className="mt-1 text-sm text-text-muted">Clientes que podem precisar de você.</p></div><Button asChild variant="ghost" size="sm" className="text-primary"><Link href="/maintenance-alerts">Ver todos</Link></Button></CardHeader><CardContent className="p-0">{alerts.isLoading ? <OrderSkeleton rows={3} /> : alerts.isError ? <ErrorBlock action={alerts.refetch} /> : (alerts.data?.items ?? []).length === 0 ? <EmptyBlock label="Nenhum alerta aberto" /> : <div className="divide-y divide-border">{alerts.data?.items.slice(0, 4).map((alert) => <Link key={alert.id} href="/maintenance-alerts" className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-muted/40"><div className="min-w-0"><p className="truncate text-sm font-semibold text-text">{alert.vehicleBrand} {alert.vehicleModel}</p><p className="mt-1 truncate text-xs text-text-muted">{alert.customerName} · {alert.vehiclePlate}</p></div><Badge variant="attention" className="shrink-0">{alert.monthsOverdue} {alert.monthsOverdue === 1 ? 'mês' : 'meses'}</Badge></Link>)}</div>}</CardContent></Card>
      </section>
    </div>
  );
}

function MetricCard({ label, value, caption, icon: Icon, tone, loading }: { label: string; value: number; caption: string; icon: React.ComponentType<{ className?: string }>; tone: 'primary' | 'info' | 'success' | 'warning'; loading: boolean }) {
  return <Card className="relative overflow-hidden"><CardContent className="p-4 sm:p-5"><div className={`mb-4 flex size-9 items-center justify-center rounded-button ${tone === 'primary' ? 'bg-primary/10 text-primary' : tone === 'info' ? 'bg-info-subtle text-info' : tone === 'success' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`}><Icon className="size-[18px]" aria-hidden="true" /></div>{loading ? <div className="h-8 w-14 animate-pulse rounded bg-muted" /> : <p className="text-3xl font-bold tracking-tight tabular-nums text-text">{value}</p>}<p className="mt-1 text-sm font-semibold text-text">{label}</p><p className="mt-1 text-xs text-text-muted">{caption}</p></CardContent></Card>;
}

function OrderRow({ item }: { item: { id: string; vehicleBrand: string; vehicleModel: string; vehiclePlate: string; customerName: string; status: ServiceOrderStatus; technicianName?: string } }) {
  return <Link href={`/service-orders/${item.id}`} className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><div className="flex size-10 shrink-0 items-center justify-center rounded-button bg-muted text-xs font-bold tracking-wide text-text">{item.vehiclePlate.slice(-4)}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-bold text-text">{item.vehicleBrand} {item.vehicleModel}</p><StatusBadge status={item.status} /></div><p className="mt-1 truncate text-xs text-text-muted">{item.vehiclePlate} · {item.customerName}{item.technicianName ? ` · ${item.technicianName}` : ''}</p></div><ArrowRight className="size-4 shrink-0 text-text-muted" aria-hidden="true" /></Link>;
}

function QuickAction({ href, label, hint, icon: Icon }: { href: string; label: string; hint: string; icon: React.ComponentType<{ className?: string }> }) { return <Link href={href} className="group flex items-center gap-3 rounded-button border border-border p-3 transition-colors hover:border-primary/30 hover:bg-selection focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="flex size-9 shrink-0 items-center justify-center rounded-button bg-muted text-text-muted transition-colors group-hover:bg-primary/10 group-hover:text-primary"><Icon className="size-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-text">{label}</span><span className="mt-0.5 block truncate text-xs text-text-muted">{hint}</span></span><ArrowRight className="size-4 text-text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></Link>; }

function OrderSkeleton({ rows = 4 }: { rows?: number }) { return <div className="divide-y divide-border">{Array.from({ length: rows }).map((_, index) => <div key={index} className="flex items-center gap-3 px-5 py-4"><div className="size-10 animate-pulse rounded-button bg-muted" /><div className="flex-1 space-y-2"><div className="h-4 w-2/3 animate-pulse rounded bg-muted" /><div className="h-3 w-1/2 animate-pulse rounded bg-muted" /></div></div>)}</div>; }
function EmptyBlock({ label = 'Nenhuma ordem de serviço encontrada' }: { label?: string }) { return <div className="flex flex-col items-center justify-center px-6 py-12 text-center"><div className="mb-3 flex size-10 items-center justify-center rounded-full bg-success-subtle text-success"><CheckCircle2 className="size-5" aria-hidden="true" /></div><p className="text-sm font-semibold text-text">{label}</p><p className="mt-1 max-w-xs text-xs leading-5 text-text-muted">Quando houver algo novo, ele aparecerá aqui.</p></div>; }
function ErrorBlock({ action }: { action: () => unknown }) { return <div className="flex flex-col items-center justify-center px-6 py-12 text-center"><div className="mb-3 flex size-10 items-center justify-center rounded-full bg-danger-subtle text-danger"><TriangleAlert className="size-5" aria-hidden="true" /></div><p className="text-sm font-semibold text-text">Não foi possível carregar os dados.</p><Button variant="outline" size="sm" className="mt-4" onClick={() => action()}>Tentar novamente</Button></div>; }
