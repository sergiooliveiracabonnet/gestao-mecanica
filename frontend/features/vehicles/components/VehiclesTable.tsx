'use client';

import type { VehicleListItemResponse } from '@oficina/contracts';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface VehiclesTableProps {
  items: VehicleListItemResponse[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  canManage: boolean;
  onEdit: (vehicle: VehicleListItemResponse) => void;
  onDelete: (vehicle: VehicleListItemResponse) => void;
}

export function VehiclesTable({ items, isLoading, isError, onRetry, canManage, onEdit, onDelete }: VehiclesTableProps) {
  if (isLoading) {
    return (
      <div role="status" aria-label="Carregando veículos" className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-12 animate-pulse rounded-card bg-surface" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-danger/30 bg-danger/5 p-8 text-center">
        <p className="text-sm text-danger">Não foi possível carregar os veículos.</p>
        <Button variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-card border border-border bg-surface p-8 text-center text-sm text-text-muted">
        Nenhum veículo ainda.{canManage && ' Cadastre o primeiro clicando em "Novo veículo".'}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Marca</TableHead>
            <TableHead>Modelo</TableHead>
            <TableHead>Placa</TableHead>
            <TableHead>Cliente</TableHead>
            {canManage && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((vehicle) => (
            <TableRow key={vehicle.id}>
              <TableCell className="font-medium text-text">{vehicle.brand}</TableCell>
              <TableCell className="text-text-muted">{vehicle.model}</TableCell>
              <TableCell className="text-text-muted">{vehicle.plate}</TableCell>
              <TableCell className="text-text-muted">{vehicle.customerName}</TableCell>
              {canManage && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(vehicle)}>
                      Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onDelete(vehicle)}>
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
