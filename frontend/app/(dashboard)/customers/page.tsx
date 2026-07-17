'use client';

import { useState } from 'react';
import type { CustomerListItemResponse } from '@oficina/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthGuard } from '@/features/auth/components/AuthGuard';
import { CustomerFormModal } from '@/features/customers/components/CustomerFormModal';
import { CustomersTable } from '@/features/customers/components/CustomersTable';
import { DeleteCustomerDialog } from '@/features/customers/components/DeleteCustomerDialog';
import { useCustomersList } from '@/features/customers/hooks/use-customers';
import { useAuthStore } from '@/stores/auth-store';

// Página depende de estado client-only (zustand persist lendo localStorage
// via AuthGuard) — nunca deve ser pré-renderizada estaticamente no build.
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

function CustomersPageContent() {
  const user = useAuthStore((state) => state.user);
  // MECHANIC vê a tela (precisa consultar o dono do veículo numa OS), mas
  // não gerencia clientes — RolesGuard do backend é a fonte de verdade,
  // isto só espelha pra esconder os botões (ver spec clientes-crud-pf-pj.md).
  const canManage = user?.role !== 'MECHANIC';

  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerListItemResponse | undefined>(undefined);
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerListItemResponse | null>(null);

  const { data, isLoading, isError, refetch } = useCustomersList({ offset, limit: PAGE_SIZE, search: search || undefined });

  function openCreateModal() {
    setEditingCustomer(undefined);
    setFormModalOpen(true);
  }

  function openEditModal(customer: CustomerListItemResponse) {
    setEditingCustomer(customer);
    setFormModalOpen(true);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">Clientes</h1>
          <p className="text-sm text-text-muted">Gerencie os clientes da sua oficina.</p>
        </div>
        {canManage && <Button onClick={openCreateModal}>Novo cliente</Button>}
      </div>

      <div className="mt-6">
        <Input
          placeholder="Buscar por nome ou documento..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setOffset(0);
          }}
          className="max-w-sm"
        />
      </div>

      <div className="mt-4">
        <CustomersTable
          items={data?.items ?? []}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          canManage={canManage}
          onEdit={openEditModal}
          onDelete={setDeletingCustomer}
        />
      </div>

      {data && data.total > PAGE_SIZE && (
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
            Anterior
          </Button>
          <Button variant="outline" disabled={!data.hasMore} onClick={() => setOffset(offset + PAGE_SIZE)}>
            Próxima
          </Button>
        </div>
      )}

      <CustomerFormModal open={formModalOpen} onOpenChange={setFormModalOpen} customer={editingCustomer} />
      <DeleteCustomerDialog open={Boolean(deletingCustomer)} onOpenChange={(open) => !open && setDeletingCustomer(null)} customer={deletingCustomer} />
    </main>
  );
}

export default function CustomersPage() {
  return (
    <AuthGuard>
      <CustomersPageContent />
    </AuthGuard>
  );
}
