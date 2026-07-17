'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Car, ClipboardList, LogOut, ShieldCheck, Users, Wrench } from 'lucide-react';
import { useLogout } from '@/features/auth/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/customers', label: 'Clientes', icon: Users },
  { href: '/vehicles', label: 'Veículos', icon: Car },
  { href: '/service-orders', label: 'Ordens de Serviço', icon: ClipboardList },
  { href: '/users', label: 'Usuários', icon: ShieldCheck },
];


const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Gerente',
  MECHANIC: 'Mecânico',
  FRONT_DESK: 'Recepção',
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Wrench className="size-4" />
        </div>
        <div className="leading-tight">
          <p className="font-semibold text-text">Oficina</p>
          <p className="text-xs text-text-muted">Gestão de oficina</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-accent text-accent-foreground' : 'text-text-muted hover:bg-accent/60 hover:text-text',
              )}
            >
              <Icon className="size-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="flex items-center gap-2.5 border-t border-border px-4 py-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials(user.name)}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-text">{user.name}</p>
            <p className="text-xs text-text-muted">{ROLE_LABELS[user.role] ?? user.role}</p>
          </div>
          <button
            type="button"
            aria-label="Sair"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
          >
            <LogOut className="size-[18px]" />
          </button>
        </div>
      )}
    </aside>
  );
}
