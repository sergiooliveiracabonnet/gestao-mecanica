'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DeleteServiceOrderDialog } from '@/features/service-orders/components/DeleteServiceOrderDialog';
import { InspectionChecklist } from '@/features/service-orders/components/InspectionChecklist';
import { StatusBadge } from '@/features/service-orders/components/StatusBadge';
import { StatusHistoryTimeline } from '@/features/service-orders/components/StatusHistoryTimeline';
import { StatusTransitionButtons } from '@/features/service-orders/components/StatusTransitionButtons';
import { parseChecklist, serializeChecklist, type InspectionItem } from '@/features/service-orders/checklist';
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
  const [checklistItems, setChecklistItems] = useState<InspectionItem[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!data) return;
    setTechnicianId(data.serviceOrder.technicianId ?? '');
    setDiagnosis(data.serviceOrder.diagnosis ?? '');
    setChecklistItems(parseChecklist(data.serviceOrder.checklist));
  }, [data]);

  if (isLoading) return <div className="h-56 animate-pulse rounded-card bg-surface" />;
  if (isError || !data) return <div className="rounded-card border border-danger/30 bg-danger-subtle p-8 text-center text-sm font-semibold text-danger-strong">Não foi possível carregar esta ordem de serviço.</div>;

  const { serviceOrder } = data;

  function handleSave() {
    update.mutate(
      { id: serviceOrder.id, technicianId: technicianId || undefined, diagnosis: diagnosis || undefined, checklist: serializeChecklist(checklistItems) },
      {
        onSuccess: () => toast.success('Ordem de serviço atualizada.'),
        onError: (error) => toast.error(extractErrorMessage(error)),
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-primary">Ordem de serviço</p>
          <h2 className="text-2xl font-bold tracking-tight text-text">{serviceOrder.vehicleBrand} {serviceOrder.vehicleModel} · {serviceOrder.vehiclePlate}</h2>
          <p className="mt-1 text-sm text-text-muted">{serviceOrder.customerName} · Aberta em {new Date(serviceOrder.openedAt).toLocaleDateString('pt-BR')}</p>
        </div>
        <div className="flex items-center gap-3 sm:pt-5"><StatusBadge status={serviceOrder.status} /><Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>Excluir</Button></div>
      </div>

      <div className="rounded-card border border-border bg-card p-4 shadow-sm sm:p-5"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">Próxima ação</p><StatusTransitionButtons serviceOrderId={serviceOrder.id} status={serviceOrder.status} /></div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.7fr)]">
        <div className="flex flex-col gap-4">
          <InspectionChecklist items={checklistItems} onChange={setChecklistItems} disabled={update.isPending} />
          <div className="rounded-card border border-border bg-card p-4 shadow-sm sm:p-5"><div className="mb-4"><p className="text-lg font-bold tracking-tight text-text">Diagnóstico</p><p className="mt-1 text-sm text-text-muted">O que a equipe encontrou e precisa executar.</p></div><Textarea id="diagnosis" value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} placeholder="Descreva o problema encontrado, causa provável e serviço recomendado..." /></div>
          <div className="flex justify-end"><Button onClick={handleSave} loading={update.isPending}>{update.isPending ? 'Salvando...' : 'Salvar alterações'}</Button></div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-4 shadow-sm sm:p-5"><div><p className="text-lg font-bold tracking-tight text-text">Responsável</p><p className="mt-1 text-sm text-text-muted">Quem está cuidando deste veículo.</p></div><div className="flex flex-col gap-2"><label className="text-sm font-semibold text-text" htmlFor="technician">Técnico</label><Select value={technicianId} onValueChange={setTechnicianId}><SelectTrigger id="technician"><SelectValue placeholder="Nenhum técnico atribuído" /></SelectTrigger><SelectContent>{usersData?.items.map((technician) => <SelectItem key={technician.id} value={technician.id}>{technician.name}</SelectItem>)}</SelectContent></Select></div></div>
          <div className="rounded-card border border-border bg-surface p-4 sm:p-5"><p className="text-xs font-bold uppercase tracking-wide text-text-muted">Veículo</p><p className="mt-2 text-base font-bold text-text">{serviceOrder.vehicleBrand} {serviceOrder.vehicleModel}</p><p className="mt-1 font-mono text-xs font-semibold tracking-wide text-text-muted">{serviceOrder.vehiclePlate}</p><Button asChild variant="outline" size="sm" className="mt-4 w-full"><a href={`/vehicles?search=${encodeURIComponent(serviceOrder.vehiclePlate)}`}>Ver histórico do veículo</a></Button></div>
        </div>
      </div>

      <div className="rounded-card border border-border bg-card p-4 shadow-sm sm:p-5"><p className="mb-3 text-lg font-bold tracking-tight text-text">Histórico da OS</p><StatusHistoryTimeline history={serviceOrder.statusHistory ?? []} /></div>

      <DeleteServiceOrderDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} serviceOrder={serviceOrder} onDeleted={() => router.push('/service-orders')} />
    </div>
  );
}
