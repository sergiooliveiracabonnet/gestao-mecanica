'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

const PAGE_META: Record<string, { title: string; description: string }> = {
  '/dashboard': { title: 'Visão da oficina', description: 'O que precisa da sua atenção hoje.' },
  '/customers': { title: 'Clientes', description: 'Gerencie os clientes da sua oficina.' },
  '/vehicles': { title: 'Veículos', description: 'Gerencie os veículos cadastrados da sua oficina.' },
  '/service-orders': { title: 'Ordens de Serviço', description: 'Acompanhe o atendimento dos veículos da sua oficina.' },
  '/users': { title: 'Usuários', description: 'Gerencie quem tem acesso à sua oficina.' },
};

// /service-orders/[id] é a primeira rota dinâmica do app — nunca bate um
// match exato em PAGE_META. Fallback por prefixo pega esse caso sem exigir
// registrar cada id possível.
const PREFIX_PAGE_META: Array<{ prefix: string; title: string; description: string }> = [
  { prefix: '/service-orders/', title: 'Ordem de Serviço', description: 'Detalhes, status e histórico desta ordem de serviço.' },
];

function resolveMeta(pathname: string | null): { title: string; description: string } {
  if (!pathname) {
    return { title: '', description: '' };
  }
  if (PAGE_META[pathname]) {
    return PAGE_META[pathname];
  }
  const prefixMatch = PREFIX_PAGE_META.find((entry) => pathname.startsWith(entry.prefix));
  return prefixMatch ?? { title: '', description: '' };
}

export function Topbar() {
  const pathname = usePathname();
  const meta = resolveMeta(pathname);

  return (
    <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-bg px-4 sm:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold leading-tight tracking-tight text-text">{meta.title}</h1>
        {meta.description && <p className="hidden truncate text-sm text-text-muted sm:block">{meta.description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button asChild variant="ghost" size="icon" className="text-text-muted hover:text-text"><Link href="/service-orders" aria-label="Buscar ordens de serviço"><Search className="size-[18px]" aria-hidden="true" /></Link></Button>
        <Button asChild variant="ghost" size="icon" className="relative text-text-muted hover:text-text"><Link href="/maintenance-alerts" aria-label="Ver alertas de manutenção"><Bell className="size-[18px]" aria-hidden="true" /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-warning" aria-hidden="true" /></Link></Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
