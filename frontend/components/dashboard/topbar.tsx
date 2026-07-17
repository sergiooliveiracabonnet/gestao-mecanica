'use client';

import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';

const PAGE_META: Record<string, { title: string; description: string }> = {
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
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-bg px-6">
      <div>
        <h1 className="text-lg font-semibold leading-tight text-text">{meta.title}</h1>
        {meta.description && <p className="text-sm text-text-muted">{meta.description}</p>}
      </div>
      <ThemeToggle />
    </header>
  );
}
