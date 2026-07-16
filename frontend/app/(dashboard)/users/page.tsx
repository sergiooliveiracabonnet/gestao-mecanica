'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AuthGuard } from '@/features/auth/components/AuthGuard';
import { InviteUserModal } from '@/features/users/components/InviteUserModal';
import { UsersTable } from '@/features/users/components/UsersTable';
import { useUsersList } from '@/features/users/hooks/use-users';

// Página depende de estado client-only (zustand persist lendo localStorage
// via AuthGuard) — nunca deve ser pré-renderizada estaticamente no build.
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

function UsersPageContent() {
  const [offset, setOffset] = useState(0);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useUsersList({ offset, limit: PAGE_SIZE });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">Usuários</h1>
          <p className="text-sm text-text-muted">Gerencie quem tem acesso à sua oficina.</p>
        </div>
        <Button onClick={() => setInviteModalOpen(true)}>Convidar usuário</Button>
      </div>

      <div className="mt-6">
        <UsersTable items={data?.items ?? []} isLoading={isLoading} isError={isError} onRetry={refetch} />
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

      <InviteUserModal open={inviteModalOpen} onOpenChange={setInviteModalOpen} />
    </main>
  );
}

export default function UsersPage() {
  return (
    <AuthGuard allowedRoles={['ADMIN', 'MANAGER']}>
      <UsersPageContent />
    </AuthGuard>
  );
}
