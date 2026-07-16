'use client';

import type { UserListItemResponse } from '@oficina/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Gerente',
  MECHANIC: 'Mecânico',
  FRONT_DESK: 'Recepção',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'border-success/30 bg-success/10 text-success',
  invited: 'border-warning/30 bg-warning/10 text-warning',
  disabled: 'border-danger/30 bg-danger/10 text-danger',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  invited: 'Convidado',
  disabled: 'Desabilitado',
};

interface UsersTableProps {
  items: UserListItemResponse[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function UsersTable({ items, isLoading, isError, onRetry }: UsersTableProps) {
  if (isLoading) {
    return (
      <div role="status" aria-label="Carregando usuários" className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-12 animate-pulse rounded-card bg-surface" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-danger/30 bg-danger/5 p-8 text-center">
        <p className="text-sm text-danger">Não foi possível carregar os usuários.</p>
        <Button variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-card border border-border bg-surface p-8 text-center text-sm text-text-muted">
        Nenhum usuário ainda. Convide o primeiro clicando em &quot;Convidar usuário&quot;.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Papel</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium text-text">{user.name}</TableCell>
              <TableCell className="text-text-muted">{user.email}</TableCell>
              <TableCell>{ROLE_LABELS[user.role] ?? user.role}</TableCell>
              <TableCell>
                <Badge variant="outline" className={STATUS_STYLES[user.status]}>
                  {STATUS_LABELS[user.status] ?? user.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
