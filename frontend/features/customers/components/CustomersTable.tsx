'use client';

import type { CustomerListItemResponse } from '@oficina/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const TYPE_LABELS: Record<string, string> = {
  PF: 'Pessoa física',
  PJ: 'Pessoa jurídica',
};

interface CustomersTableProps {
  items: CustomerListItemResponse[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  canManage: boolean;
  onEdit: (customer: CustomerListItemResponse) => void;
  onDelete: (customer: CustomerListItemResponse) => void;
}

export function CustomersTable({ items, isLoading, isError, onRetry, canManage, onEdit, onDelete }: CustomersTableProps) {
  if (isLoading) {
    return (
      <div role="status" aria-label="Carregando clientes" className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-12 animate-pulse rounded-card bg-surface" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-danger/30 bg-danger/5 p-8 text-center">
        <p className="text-sm text-danger">Não foi possível carregar os clientes.</p>
        <Button variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-card border border-border bg-surface p-8 text-center text-sm text-text-muted">
        Nenhum cliente ainda.{canManage && ' Cadastre o primeiro clicando em "Novo cliente".'}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Documento</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Tipo</TableHead>
            {canManage && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell className="font-medium text-text">{customer.name}</TableCell>
              <TableCell className="text-text-muted">{customer.document}</TableCell>
              <TableCell className="text-text-muted">{customer.phone}</TableCell>
              <TableCell>
                <Badge variant="outline">{TYPE_LABELS[customer.type] ?? customer.type}</Badge>
              </TableCell>
              {canManage && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(customer)}>
                      Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onDelete(customer)}>
                      Excluir
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
