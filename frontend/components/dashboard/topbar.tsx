'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { useMaintenanceAlertsList } from '@/features/maintenance-alerts/hooks/use-maintenance-alerts';
import { useDueServiceOrderInstallments } from '@/features/service-orders/hooks/use-service-orders';
import { useAuthStore } from '@/stores/auth-store';
import { hasPermission } from '@/features/auth/permissions';

const PAGE_META: Record<string, { title: string; description: string }> = {
  '/dashboard': { title: 'Visão da oficina', description: 'O que precisa da sua atenção hoje.' },
  '/financial': { title: 'Financeiro', description: 'Indicadores financeiros e desempenho da oficina.' },
  '/appointments': { title: 'Agenda', description: 'Organize os atendimentos da oficina.' },
  '/customers': { title: 'Clientes', description: 'Gerencie os clientes da sua oficina.' },
  '/vehicles': { title: 'Veículos', description: 'Gerencie os veículos cadastrados da sua oficina.' },
  '/service-orders': { title: 'Ordens de Serviço', description: 'Acompanhe o atendimento dos veículos da sua oficina.' },
  '/maintenance-alerts': { title: 'Alertas de manutenção', description: 'Acompanhe os contatos preventivos pendentes.' },
  '/users': { title: 'Equipe e acesso', description: 'Gerencie usuários, perfis e permissões.' },
};

const PREFIX_PAGE_META: Array<{ prefix: string; title: string; description: string }> = [
  { prefix: '/financial/', title: 'Financeiro', description: 'Fluxo de caixa, lançamentos, categorias e relatórios.' },
  { prefix: '/service-orders/', title: 'Ordem de Serviço', description: 'Detalhes, status e histórico desta ordem de serviço.' },
];

function resolveMeta(pathname: string | null): { title: string; description: string } {
  if (!pathname) return { title: '', description: '' };
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  return PREFIX_PAGE_META.find((entry) => pathname.startsWith(entry.prefix)) ?? { title: '', description: '' };
}

export function Topbar() {
  const pathname = usePathname();
  const meta = resolveMeta(pathname);
  const alerts = useMaintenanceAlertsList({ offset: 0, limit: 1, status: 'OPEN' });
  const user = useAuthStore((state) => state.user);
  const canManageReceipts = hasPermission(user, 'receipts.manage');
  const dueInstallments = useDueServiceOrderInstallments(canManageReceipts ? 1 : 0);
  const financialAlertCount = canManageReceipts ? (dueInstallments.data?.total ?? 0) : 0;
  const openAlertCount = (alerts.data?.total ?? 0) + financialAlertCount;
  const alertLabel = openAlertCount > 0
    ? `Ver alertas (${openAlertCount} pendentes)`
    : 'Ver alertas';
  const alertHref = financialAlertCount > 0 && dueInstallments.data?.items[0]
    ? `/service-orders/${dueInstallments.data.items[0].serviceOrderId}`
    : '/maintenance-alerts';

  return (
    <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-bg px-4 sm:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold leading-tight tracking-tight text-text">{meta.title}</h1>
        {meta.description && <p className="hidden truncate text-sm text-text-muted sm:block">{meta.description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button asChild variant="ghost" size="icon" className="text-text-muted hover:text-text">
          <Link href="/service-orders" aria-label="Buscar ordens de serviço"><Search className="size-[18px]" aria-hidden="true" /></Link>
        </Button>
        <Button asChild variant="ghost" size="icon" className="relative text-text-muted hover:text-text">
          <Link href={alertHref} aria-label={alertLabel}>
            <Bell className="size-[18px]" aria-hidden="true" />
            {openAlertCount > 0 && <span data-testid="open-alert-indicator" className="absolute right-2 top-2 size-1.5 rounded-full bg-warning" aria-hidden="true" />}
          </Link>
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
