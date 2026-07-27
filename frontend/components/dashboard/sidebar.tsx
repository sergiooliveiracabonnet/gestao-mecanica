'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bell, Car, ClipboardList, LayoutDashboard, LogOut, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Plus, ShieldCheck, Users, Wrench } from 'lucide-react';
import { useLogout } from '@/features/auth/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

interface NavItem { href: string; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }>; }

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Visão da oficina', shortLabel: 'Visão', icon: LayoutDashboard },
  { href: '/service-orders', label: 'Ordens de serviço', shortLabel: 'OS', icon: ClipboardList },
  { href: '/customers', label: 'Clientes', shortLabel: 'Clientes', icon: Users },
  { href: '/vehicles', label: 'Veículos', shortLabel: 'Veículos', icon: Car },
  { href: '/maintenance-alerts', label: 'Alertas de manutenção', shortLabel: 'Alertas', icon: Bell },
  { href: '/users', label: 'Equipe e acesso', shortLabel: 'Equipe', icon: ShieldCheck },
];

const ROLE_LABELS: Record<string, string> = { ADMIN: 'Administrador', MANAGER: 'Gerente', MECHANIC: 'Mecânico', FRONT_DESK: 'Recepção' };

function initials(name: string): string { const parts = name.trim().split(/\s+/); return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase(); }
function isActive(pathname: string | null, href: string): boolean { return pathname === href || Boolean(pathname?.startsWith(`${href}/`)); }

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const isCollapsed = window.localStorage.getItem('oficina.sidebar.collapsed') === 'true';
    setCollapsed(isCollapsed);
    document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '5rem' : '16rem');
  }, []);

  function toggleSidebar() {
    setCollapsed((current) => { const next = !current; window.localStorage.setItem('oficina.sidebar.collapsed', String(next)); document.documentElement.style.setProperty('--sidebar-width', next ? '5rem' : '16rem'); return next; });
  }

  return <>
    <aside className={cn('fixed inset-y-0 left-0 z-40 hidden h-screen shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-normal md:flex', collapsed ? 'w-20' : 'w-64')}>
      <div className={cn('flex items-center py-5', collapsed ? 'justify-center px-3' : 'gap-3 px-4')}>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-button bg-primary text-primary-foreground shadow-sm"><Wrench className="size-[18px]" aria-hidden="true" /></div>
        {!collapsed && <div className="min-w-0 flex-1 leading-tight"><p className="font-bold tracking-tight text-text">Oficina</p><p className="text-xs text-text-muted">Gestão operacional</p></div>}
        {!collapsed && <button type="button" onClick={toggleSidebar} aria-label="Recolher menu lateral" title="Recolher menu" className="flex size-8 shrink-0 items-center justify-center rounded-button text-text-muted transition-colors hover:bg-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><PanelLeftClose className="size-4" aria-hidden="true" /></button>}
      </div>

      <div className={cn('pb-3', collapsed ? 'px-3' : 'px-4')}><Link href="/service-orders/new" aria-label="Novo atendimento" title="Novo atendimento" className={cn('flex h-10 w-full items-center justify-center rounded-button bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', collapsed ? 'px-0' : 'gap-2 px-3')}><Plus className="size-4" aria-hidden="true" />{!collapsed && 'Novo atendimento'}</Link></div>

      <nav aria-label="Navegação principal" className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {!collapsed && <p className="px-3 pb-2 pt-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">Operação</p>}
        {NAV_ITEMS.slice(0, 2).map((item) => <DesktopNavItem key={item.href} item={item} active={isActive(pathname, item.href)} collapsed={collapsed} />)}
        {!collapsed && <p className="px-3 pb-2 pt-6 text-[11px] font-bold uppercase tracking-wider text-text-muted">Relacionamento</p>}
        {NAV_ITEMS.slice(2, 5).map((item) => <DesktopNavItem key={item.href} item={item} active={isActive(pathname, item.href)} collapsed={collapsed} />)}
        {!collapsed && <p className="px-3 pb-2 pt-6 text-[11px] font-bold uppercase tracking-wider text-text-muted">Gestão</p>}
        <DesktopNavItem item={NAV_ITEMS[5]} active={isActive(pathname, NAV_ITEMS[5].href)} collapsed={collapsed} />
      </nav>

      {user && <div className={cn('flex items-center border-t border-border py-4', collapsed ? 'justify-center px-3' : 'gap-2.5 px-4')}><div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{initials(user.name)}</div>{!collapsed && <div className="min-w-0 flex-1 leading-tight"><p className="truncate text-sm font-semibold text-text">{user.name}</p><p className="text-xs text-text-muted">{ROLE_LABELS[user.role] ?? user.role}</p></div>}<button type="button" aria-label="Sair" onClick={() => logout.mutate()} disabled={logout.isPending} className="flex size-9 items-center justify-center rounded-button text-text-muted transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"><LogOut className="size-[18px]" aria-hidden="true" /></button></div>}
      {collapsed && <button type="button" onClick={toggleSidebar} aria-label="Expandir menu lateral" title="Expandir menu" className="absolute right-[-14px] top-5 hidden size-7 items-center justify-center rounded-full border border-border bg-background text-text-muted shadow-sm hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex"><PanelLeftOpen className="size-3.5" aria-hidden="true" /></button>}
    </aside>

    <nav aria-label="Navegação móvel" className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 border-t border-border bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">{NAV_ITEMS.slice(0, 5).map((item) => { const active = isActive(pathname, item.href); const Icon = item.icon; return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={cn('flex min-w-0 flex-col items-center justify-center gap-1 rounded-button text-[10px] font-semibold transition-colors', active ? 'text-primary' : 'text-text-muted')}><Icon className="size-[18px]" aria-hidden="true" /><span className="truncate">{item.shortLabel}</span></Link>; })}<Link href="/users" aria-label="Mais opções" className="hidden" aria-hidden="true"><MoreHorizontal /></Link></nav>
  </>;
}

function DesktopNavItem({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) { const Icon = item.icon; return <Link href={item.href} aria-current={active ? 'page' : undefined} aria-label={collapsed ? item.label : undefined} title={collapsed ? item.label : undefined} className={cn('flex min-h-10 items-center rounded-button text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', collapsed ? 'justify-center px-0' : 'gap-3 px-3', active ? 'bg-selection text-accent-foreground' : 'text-text-muted hover:bg-accent/60 hover:text-text')}><Icon className="size-[18px] shrink-0" aria-hidden="true" />{!collapsed && item.label}</Link>; }
