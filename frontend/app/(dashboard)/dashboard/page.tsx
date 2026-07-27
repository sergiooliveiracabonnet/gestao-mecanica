'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, PackageOpen, RefreshCw, TriangleAlert, Users, WalletCards, Wrench } from 'lucide-react';
import type { AppointmentResponse, ServiceOrderListItemResponse } from '@oficina/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { prioritizeOperationalOrders, todayRange } from '@/features/dashboard/dashboard-model';
import { useAppointments } from '@/features/appointments/hooks/use-appointments';
import { useMaintenanceAlertsList } from '@/features/maintenance-alerts/hooks/use-maintenance-alerts';
import { StatusBadge } from '@/features/service-orders/components/StatusBadge';
import { NewServiceOrderQuickStart } from '@/features/service-orders/components/NewServiceOrderQuickStart';
import { useServiceOrdersList } from '@/features/service-orders/hooks/use-service-orders';
import { useDueServiceOrderInstallments } from '@/features/service-orders/hooks/use-service-orders';
import { hasPermission } from '@/features/auth/permissions';
import { useAuthStore } from '@/stores/auth-store';

const EMPTY_ORDERS: ServiceOrderListItemResponse[] = [];
const APPOINTMENT_STATUS_LABELS = {
  SCHEDULED: 'Agendado',
  CONFIRMED: 'Confirmado',
  IN_SERVICE: 'Em atendimento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Não compareceu',
} as const;

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const canManageReceipts = hasPermission(user, 'receipts.manage');
  const canManageServiceOrders = hasPermission(user, 'service_orders.manage');
  const range = useMemo(() => todayRange(), []);
  const open = useServiceOrdersList({ offset: 0, limit: 100, status: 'OPEN' });
  const awaitingApproval = useServiceOrdersList({ offset: 0, limit: 100, status: 'AWAITING_APPROVAL' });
  const inProgress = useServiceOrdersList({ offset: 0, limit: 100, status: 'IN_PROGRESS' });
  const waitingParts = useServiceOrdersList({ offset: 0, limit: 100, status: 'WAITING_PARTS' });
  const completed = useServiceOrdersList({ offset: 0, limit: 100, status: 'COMPLETED' });
  const dueInstallments = useDueServiceOrderInstallments(canManageReceipts ? 4 : 0);
  const appointments = useAppointments(range);
  const alerts = useMaintenanceAlertsList({ offset: 0, limit: 4, status: 'OPEN' });

  const queries = [open, awaitingApproval, inProgress, waitingParts, completed];
  const allOperationalItems = useMemo(() => prioritizeOperationalOrders([
    ...(waitingParts.data?.items ?? EMPTY_ORDERS),
    ...(awaitingApproval.data?.items ?? EMPTY_ORDERS),
    ...(open.data?.items ?? EMPTY_ORDERS),
    ...(inProgress.data?.items ?? EMPTY_ORDERS),
    ...(completed.data?.items ?? EMPTY_ORDERS),
  ]), [waitingParts.data?.items, awaitingApproval.data?.items, open.data?.items, inProgress.data?.items, completed.data?.items]);
  const operationalItems = allOperationalItems.slice(0, 6);
  const overdueOrders = allOperationalItems.filter((item) => item.expectedDeliveryAt && new Date(item.expectedDeliveryAt) < new Date());
  const technicianWorkload = useMemo(() => {
    const counts = new Map<string, number>();
    [...(inProgress.data?.items ?? []), ...(waitingParts.data?.items ?? [])].forEach((item) => counts.set(item.technicianName ?? 'Sem técnico', (counts.get(item.technicianName ?? 'Sem técnico') ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [inProgress.data?.items, waitingParts.data?.items]);
  const todayAppointments = (appointments.data?.items ?? [])
    .filter((item) => !['CANCELLED', 'NO_SHOW', 'COMPLETED'].includes(item.status))
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
  const occupiedHours = todayAppointments.reduce((total, item) => total + Math.max(0, (new Date(item.endsAt).getTime() - new Date(item.startsAt).getTime()) / 3_600_000), 0);
  const isRefreshing = queries.some((query) => query.isFetching) || appointments.isFetching || alerts.isFetching || dueInstallments.isFetching;
  const hasOperationalError = queries.some((query) => query.isError);

  function refreshDashboard() {
    queries.forEach((query) => void query.refetch());
    void appointments.refetch();
    void alerts.refetch();
    if (canManageReceipts) void dueInstallments.refetch();
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-text">Operação de hoje</h2>
          <p className="mt-1 text-sm text-text-muted">Agenda, pendências e veículos que exigem decisão agora.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refreshDashboard} disabled={isRefreshing}><RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />Atualizar</Button>
          {canManageServiceOrders && <NewServiceOrderQuickStart size="sm" />}
        </div>
      </header>

      <section aria-label="Pendências operacionais" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricLink href="/appointments" label="Agenda de hoje" value={todayAppointments.length} caption={`${occupiedHours.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h reservadas`} icon={CalendarDays} tone="warning" loading={appointments.isLoading} />
        <MetricLink href="/service-orders?status=IN_PROGRESS" label="Em execução" value={inProgress.data?.total} caption="na oficina agora" icon={RefreshCw} tone="primary" loading={inProgress.isLoading} />
        <MetricLink href="/service-orders" label="OS atrasadas" value={overdueOrders.length} caption="previsão de entrega vencida" icon={TriangleAlert} tone="danger" loading={queries.some((query) => query.isLoading)} />
        <MetricLink href="/service-orders?status=COMPLETED" label="Prontos para entrega" value={completed.data?.total} caption="avisar e entregar" icon={CheckCircle2} tone="success" loading={completed.isLoading} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.4fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-start justify-between border-b border-border">
            <div><CardTitle>Agenda de hoje</CardTitle><p className="mt-1 text-sm text-text-muted">{todayAppointments.length} {todayAppointments.length === 1 ? 'atendimento pendente' : 'atendimentos pendentes'}</p></div>
            <Button asChild variant="ghost" size="sm" className="text-primary"><Link href="/appointments">Abrir agenda<ArrowRight className="size-4" /></Link></Button>
          </CardHeader>
          <CardContent className="p-0">
            {appointments.isLoading ? <RowsSkeleton rows={4} /> : appointments.isError ? <ErrorBlock action={appointments.refetch} /> : todayAppointments.length === 0 ? <EmptyBlock icon={CalendarDays} title="Agenda livre hoje" detail="Novos agendamentos aparecerão aqui." /> : <div className="divide-y divide-border">{todayAppointments.slice(0, 5).map((item) => <AppointmentRow key={item.id} item={item} />)}</div>}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-start justify-between border-b border-border">
            <div><CardTitle>Atenção agora</CardTitle><p className="mt-1 text-sm text-text-muted">Atrasos e bloqueios aparecem primeiro.</p></div>
            <Button asChild variant="ghost" size="sm" className="text-primary"><Link href="/service-orders">Abrir quadro<ArrowRight className="size-4" /></Link></Button>
          </CardHeader>
          <CardContent className="p-0">
            {queries.some((query) => query.isLoading) ? <RowsSkeleton /> : hasOperationalError ? <ErrorBlock action={refreshDashboard} /> : operationalItems.length === 0 ? <EmptyBlock icon={CheckCircle2} title="Operação em dia" detail="Nenhuma OS exige atenção agora." /> : <div className="divide-y divide-border">{operationalItems.map((item) => <OrderRow key={item.id} item={item} />)}</div>}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card className="overflow-hidden">
          <CardHeader><CardTitle>Carga da equipe</CardTitle><p className="mt-1 text-sm text-text-muted">OS em execução ou bloqueadas por técnico.</p></CardHeader>
          <CardContent className="p-0">{technicianWorkload.length === 0 ? <EmptyBlock icon={Users} title="Nenhuma carga ativa" detail="Os técnicos ainda não possuem OS em andamento." /> : <div className="divide-y divide-border">{technicianWorkload.slice(0, 6).map(([name, count]) => <div key={name} className="flex items-center justify-between gap-3 px-5 py-3.5"><div className="flex min-w-0 items-center gap-3"><span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary"><Wrench className="size-4" /></span><span className="truncate text-sm font-semibold">{name}</span></div><Badge variant={name === 'Sem técnico' ? 'critical' : count >= 4 ? 'attention' : 'default'}>{count} {count === 1 ? 'OS' : 'OS'}</Badge></div>)}</div>}</CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-start justify-between"><div><CardTitle>Clientes para contatar</CardTitle><p className="mt-1 text-sm text-text-muted">Manutenções preventivas vencidas.</p></div><Button asChild variant="ghost" size="sm" className="text-primary"><Link href="/maintenance-alerts">Ver todos</Link></Button></CardHeader>
          <CardContent className="p-0">{alerts.isLoading ? <RowsSkeleton rows={3} /> : alerts.isError ? <ErrorBlock action={alerts.refetch} /> : (alerts.data?.items ?? []).length === 0 ? <EmptyBlock icon={CheckCircle2} title="Nenhum contato pendente" detail="Os alertas preventivos estão em dia." /> : <div className="divide-y divide-border">{alerts.data?.items.map((alert) => <Link key={alert.id} href="/maintenance-alerts" className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40"><div className="min-w-0"><p className="truncate text-sm font-semibold text-text">{alert.customerName}</p><p className="mt-0.5 truncate text-xs text-text-muted">{alert.vehicleBrand} {alert.vehicleModel} · {alert.vehiclePlate}</p></div><Badge variant="attention">{alert.monthsOverdue} {alert.monthsOverdue === 1 ? 'mês' : 'meses'}</Badge></Link>)}</div>}</CardContent>
        </Card>
      </section>

      <section className={`grid gap-5 ${canManageReceipts ? 'xl:grid-cols-2' : ''}`}>
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-start justify-between"><div><CardTitle>Bloqueios da operação</CardTitle><p className="mt-1 text-sm text-text-muted">Veículos parados aguardando peças.</p></div><Button asChild variant="ghost" size="sm"><Link href="/service-orders?status=WAITING_PARTS">Ver todos</Link></Button></CardHeader>
          <CardContent className="p-0">{(waitingParts.data?.items ?? []).length === 0 ? <EmptyBlock icon={CheckCircle2} title="Nenhum bloqueio por peça" detail="A execução não está parada por falta de material." /> : <div className="divide-y divide-border">{waitingParts.data?.items.slice(0, 5).map((item) => <Link key={item.id} href={`/service-orders/${item.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/40"><div><p className="text-sm font-semibold">{item.vehiclePlate} · {item.customerName}</p><p className="mt-0.5 text-xs text-text-muted">Aguardando peças · OS aberta há {daysSince(item.openedAt)} {daysSince(item.openedAt) === 1 ? 'dia' : 'dias'}</p></div><PackageOpen className="size-4 text-danger" /></Link>)}</div>}</CardContent>
        </Card>
        {canManageReceipts && <Card className="overflow-hidden"><CardHeader className="flex-row items-start justify-between"><div><CardTitle>Pendências administrativas</CardTitle><p className="mt-1 text-sm text-text-muted">Parcelas próximas ou vencidas que exigem confirmação.</p></div><Button asChild variant="ghost" size="sm"><Link href="/financial/receivables">Abrir financeiro</Link></Button></CardHeader><CardContent className="divide-y divide-border p-0">{(dueInstallments.data?.items ?? []).map((item) => <Link key={item.id} href={`/service-orders/${item.serviceOrderId}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/40"><div><p className="text-sm font-semibold">Parcela {item.installmentNumber}/{item.installmentCount} · {item.customerName}</p><p className="mt-0.5 text-xs text-text-muted">Vence em {new Date(item.dueAt).toLocaleDateString('pt-BR')}</p></div><WalletCards className="size-4 text-warning" /></Link>)}{(dueInstallments.data?.items.length ?? 0) === 0 && <EmptyBlock icon={CheckCircle2} title="Administrativo em dia" detail="Nenhuma parcela exige ação agora." />}</CardContent></Card>}
      </section>

    </div>
  );
}

function MetricLink({ href, label, value, caption, icon: Icon, tone, loading }: { href: string; label: string; value?: number; caption: string; icon: React.ComponentType<{ className?: string }>; tone: 'primary' | 'warning' | 'danger' | 'success'; loading: boolean }) {
  const toneClass = tone === 'primary' ? 'bg-primary/10 text-primary' : tone === 'warning' ? 'bg-warning-subtle text-warning' : tone === 'danger' ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success';
  return <Link href={href} className="group rounded-card border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/30 hover:bg-selection/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5"><div className="flex items-start justify-between"><span className={`flex size-9 items-center justify-center rounded-button ${toneClass}`}><Icon className="size-[18px]" /></span><ArrowRight className="size-4 text-text-muted transition-transform group-hover:translate-x-0.5" /></div>{loading ? <div className="mt-4 h-8 w-12 animate-pulse rounded bg-muted" /> : <p className="mt-4 text-3xl font-bold tabular-nums text-text">{value ?? 0}</p>}<p className="mt-1 text-sm font-semibold text-text">{label}</p><p className="mt-1 text-xs leading-4 text-text-muted">{caption}</p></Link>;
}

function AppointmentRow({ item }: { item: AppointmentResponse }) {
  return <Link href="/appointments" className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40"><time className="w-11 shrink-0 text-sm font-bold tabular-nums text-primary">{new Date(item.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-text">{item.customerName} · {item.vehiclePlate}</p><p className="mt-0.5 truncate text-xs text-text-muted">{item.serviceDescription}</p></div><Badge variant={item.status === 'CONFIRMED' ? 'success' : item.status === 'IN_SERVICE' ? 'info' : 'default'}>{APPOINTMENT_STATUS_LABELS[item.status]}</Badge></Link>;
}

function OrderRow({ item }: { item: ServiceOrderListItemResponse }) {
  const overdue = item.expectedDeliveryAt && new Date(item.expectedDeliveryAt) < new Date();
  const reason = overdue ? `Entrega atrasada há ${daysSince(item.expectedDeliveryAt!)} ${daysSince(item.expectedDeliveryAt!) === 1 ? 'dia' : 'dias'}` : item.status === 'WAITING_PARTS' ? 'Aguardando chegada de peças' : item.status === 'AWAITING_APPROVAL' ? 'Orçamento aguardando resposta do cliente' : !item.technicianName ? 'Precisa de técnico responsável' : item.status === 'COMPLETED' ? 'Cliente deve ser avisado para retirada' : item.status === 'OPEN' ? 'Aguardando início da execução' : 'Serviço em andamento';
  return <Link href={`/service-orders/${item.id}`} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40"><div className="flex size-10 shrink-0 items-center justify-center rounded-button bg-muted text-xs font-bold text-text">{item.vehiclePlate.slice(-4)}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-bold text-text">{item.vehicleBrand} {item.vehicleModel}</p><StatusBadge status={item.status} />{overdue && <Badge variant="critical">Atrasada</Badge>}</div><p className="mt-1 truncate text-xs font-semibold text-text-muted">{reason}</p><p className="mt-0.5 truncate text-[11px] text-text-muted">{item.customerName}{item.technicianName ? ` · ${item.technicianName}` : ' · Sem técnico'}</p></div><ArrowRight className="size-4 shrink-0 text-text-muted" /></Link>;
}

function daysSince(value: string): number { return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000)); }

function RowsSkeleton({ rows = 4 }: { rows?: number }) { return <div className="divide-y divide-border">{Array.from({ length: rows }).map((_, index) => <div key={index} className="flex items-center gap-3 px-5 py-4"><div className="size-10 animate-pulse rounded-button bg-muted" /><div className="flex-1 space-y-2"><div className="h-4 w-2/3 animate-pulse rounded bg-muted" /><div className="h-3 w-1/2 animate-pulse rounded bg-muted" /></div></div>)}</div>; }
function EmptyBlock({ icon: Icon, title, detail }: { icon: React.ComponentType<{ className?: string }>; title: string; detail: string }) { return <div className="flex flex-col items-center justify-center px-6 py-10 text-center"><div className="mb-3 flex size-10 items-center justify-center rounded-full bg-success-subtle text-success"><Icon className="size-5" /></div><p className="text-sm font-semibold text-text">{title}</p><p className="mt-1 text-xs text-text-muted">{detail}</p></div>; }
function ErrorBlock({ action }: { action: () => unknown }) { return <div className="flex flex-col items-center justify-center px-6 py-10 text-center"><TriangleAlert className="mb-3 size-5 text-danger" /><p className="text-sm font-semibold text-text">Não foi possível carregar estes dados.</p><Button variant="outline" size="sm" className="mt-3" onClick={() => action()}>Tentar novamente</Button></div>; }
