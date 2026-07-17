'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DeleteServiceOrderDialog } from '@/features/service-orders/components/DeleteServiceOrderDialog';
import { StatusBadge } from '@/features/service-orders/components/StatusBadge';
import { StatusHistoryTimeline } from '@/features/service-orders/components/StatusHistoryTimeline';
import { StatusTransitionButtons } from '@/features/service-orders/components/StatusTransitionButtons';
import { useServiceOrder, useUpdateServiceOrder } from '@/features/service-orders/hooks/use-service-orders';
import { useUsersList } from '@/features/users/hooks/use-users';
import { extractErrorMessage } from '@/lib/api/client';

const TECHNICIAN_PICKER_LIMIT = 100;

export default function ServiceOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, isError } = useServiceOrder(params.id);
  const update = useUpdateServiceOrder();
  const { data: usersData } = useUsersList({ offset: 0, limit: TECHNICIAN_PICKER_LIMIT, filters: { status: 'active' } });

  const [technicianId, setTechnicianId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [checklistText, setChecklistText] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!data) {
      return;
    }
    setTechnicianId(data.serviceOrder.technicianId ?? '');
    setDiagnosis(data.serviceOrder.diagnosis ?? '');
    setChecklistText(data.serviceOrder.checklist ? JSON.stringify(data.serviceOrder.checklist, null, 2) : '');
  }, [data]);

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-card bg-surface" />;
  }

  if (isError || !data) {
    return (
      <div className="rounded-card border border-danger/30 bg-danger/5 p-8 text-center text-sm text-danger">
        Não foi possível carregar esta ordem de serviço.
      </div>
    );
  }

  const { serviceOrder } = data;

  function handleSave() {
    let checklist: Record<string, unknown> | undefined;
    if (checklistText.trim()) {
      try {
        const parsed = JSON.parse(checklistText);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          throw new Error('not an object');
        }
        checklist = parsed as Record<string, unknown>;
      } catch {
        toast.error('Checklist precisa ser um JSON válido (objeto).');
        return;
      }
    }

    update.mutate(
      { id: serviceOrder.id, technicianId: technicianId || undefined, diagnosis: diagnosis || undefined, checklist },
      {
        onSuccess: () => toast.success('Ordem de serviço atualizada.'),
        onError: (error) => toast.error(extractErrorMessage(error)),
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">
            {serviceOrder.vehicleBrand} {serviceOrder.vehicleModel} · {serviceOrder.vehiclePlate}
          </h2>
          <p className="text-sm text-text-muted">{serviceOrder.customerName}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={serviceOrder.status} />
          <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
            Excluir
          </Button>
        </div>
      </div>

      <div className="rounded-card border border-border bg-card p-4 shadow-sm">
        <p className="mb-2 text-sm font-medium text-text">Avançar status</p>
        <StatusTransitionButtons serviceOrderId={serviceOrder.id} status={serviceOrder.status} />
      </div>

      <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-4 shadow-sm">
        <p className="text-sm font-medium text-text">Detalhes</p>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-text" htmlFor="technician">
            Técnico
          </label>
          <Select value={technicianId} onValueChange={setTechnicianId}>
            <SelectTrigger id="technician">
              <SelectValue placeholder="Nenhum técnico atribuído" />
            </SelectTrigger>
            <SelectContent>
              {usersData?.items.map((technician) => (
                <SelectItem key={technician.id} value={technician.id}>
                  {technician.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-text" htmlFor="diagnosis">
            Diagnóstico
          </label>
          <Textarea id="diagnosis" value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-text" htmlFor="checklist">
            Checklist (JSON livre)
          </label>
          <Textarea
            id="checklist"
            className="font-mono text-xs"
            rows={6}
            value={checklistText}
            onChange={(event) => setChecklistText(event.target.value)}
          />
        </div>
        <div>
          <Button onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </div>
      </div>

      <div className="rounded-card border border-border bg-card p-4 shadow-sm">
        <p className="mb-3 text-sm font-medium text-text">Histórico</p>
        <StatusHistoryTimeline history={serviceOrder.statusHistory ?? []} />
      </div>

      <DeleteServiceOrderDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        serviceOrder={serviceOrder}
        onDeleted={() => router.push('/service-orders')}
      />
    </div>
  );
}
