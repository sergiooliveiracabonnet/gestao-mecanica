'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowDownToLine, ArrowUpFromLine, BarChart3, BookOpen, Factory, FolderTree, LayoutDashboard, ReceiptText } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/financial', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/financial/payables', label: 'Contas a pagar', icon: ArrowUpFromLine },
  { href: '/financial/receivables', label: 'Contas a receber', icon: ArrowDownToLine },
  { href: '/financial/cash-flow', label: 'Fluxo de caixa', icon: BarChart3 },
  { href: '/financial/transactions', label: 'Movimentações', icon: ReceiptText },
  { href: '/financial/categories', label: 'Categorias', icon: FolderTree },
  { href: '/financial/suppliers', label: 'Fornecedores', icon: Factory },
  { href: '/financial/reports', label: 'Relatórios', icon: BookOpen },
];

export function FinancialNav() {
  const pathname = usePathname();
  return <nav aria-label="Seções do financeiro" className="flex gap-1 overflow-x-auto rounded-card border border-border bg-card p-1.5 shadow-sm">{ITEMS.map((item) => {
    const Icon = item.icon;
    const active = pathname === item.href;
    return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={cn('flex shrink-0 items-center gap-2 rounded-button px-3 py-2 text-sm font-semibold transition-colors', active ? 'bg-primary text-primary-foreground' : 'text-text-muted hover:bg-muted hover:text-text')}><Icon className="size-4" />{item.label}</Link>;
  })}</nav>;
}
