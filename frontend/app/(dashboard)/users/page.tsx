'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AuthGuard } from '@/features/auth/components/AuthGuard';
import { InviteUserModal } from '@/features/users/components/InviteUserModal';
import { UsersTable } from '@/features/users/components/UsersTable';
import { useUsersList } from '@/features/users/hooks/use-users';

const PAGE_SIZE = 20;

function UsersPageContent() {
  const [offset, setOffset] = useState(0);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useUsersList({ offset, limit: PAGE_SIZE });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setInviteModalOpen(true)}>Convidar usuário</Button>
      </div>

      <UsersTable items={data?.items ?? []} isLoading={isLoading} isError={isError} onRetry={refetch} />

      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-text-muted">
          <span>{data.total} usuários no total</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={!data.hasMore} onClick={() => setOffset(offset + PAGE_SIZE)}>
              Próxima
            </Button>
          </div>
        </div>
      )}

      <InviteUserModal open={inviteModalOpen} onOpenChange={setInviteModalOpen} />
    </div>
  );
}

export default function UsersPage() {
  // Restrição de papel específica desta página — o AuthGuard do layout
  // (app/(dashboard)/layout.tsx) só garante "está logado", não papéis.
  // Redireciona pra /customers (não pro default '/users' do AuthGuard,
  // que aqui seria um loop) quando o papel não tem acesso.
  return (
    <AuthGuard allowedRoles={['ADMIN', 'MANAGER']} redirectOnForbiddenTo="/customers">
      <UsersPageContent />
    </AuthGuard>
  );
}
