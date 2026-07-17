'use client';

import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';

const PAGE_META: Record<string, { title: string; description: string }> = {
  '/customers': { title: 'Clientes', description: 'Gerencie os clientes da sua oficina.' },
  '/vehicles': { title: 'Veículos', description: 'Gerencie os veículos cadastrados da sua oficina.' },
  '/users': { title: 'Usuários', description: 'Gerencie quem tem acesso à sua oficina.' },
};

export function Topbar() {
  const pathname = usePathname();
  const meta = (pathname && PAGE_META[pathname]) || { title: '', description: '' };

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
