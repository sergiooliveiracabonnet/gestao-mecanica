'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, ClipboardList, UserRound, CarFront } from 'lucide-react';
import type { CustomerListItemResponse, ServiceOrderListItemResponse } from '@oficina/contracts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomerFormModal } from '@/features/customers/components/CustomerFormModal';
import { ServiceOrderFormModal } from '@/features/service-orders/components/ServiceOrderFormModal';
import { VehicleFormModal } from '@/features/vehicles/components/VehicleFormModal';

type Step = 'customer' | 'vehicle' | 'order' | 'done';

const STEPS: Array<{ id: Exclude<Step, 'done'>; label: string; description: string; icon: typeof UserRound }> = [
  { id: 'customer', label: 'Cliente', description: 'Quem trouxe o veículo', icon: UserRound },
  { id: 'vehicle', label: 'Veículo', description: 'Carro que será atendido', icon: CarFront },
  { id: 'order', label: 'Ordem de serviço', description: 'Serviço e responsável', icon: ClipboardList },
];

export default function NewServiceOrderPage() {
  const [step, setStep] = useState<Step>('order');
  const [customer, setCustomer] = useState<CustomerListItemResponse>();
  const [vehicle, setVehicle] = useState<{ id: string; brand: string; model: string; plate: string; customerId: string; customerName: string }>();
  const [serviceOrder, setServiceOrder] = useState<ServiceOrderListItemResponse>();
  const advancing = useRef(false);

  function closeCurrentStep() {
    if (advancing.current) {
      advancing.current = false;
      return;
    }
    window.history.back();
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <Link href="/service-orders" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-text-muted transition-colors hover:text-text">
        <ArrowLeft className="size-4" aria-hidden="true" /> Voltar para ordens de serviço
      </Link>

      <section className="rounded-card border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">Atendimento guiado</p>
            <h1 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">Novo atendimento</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">Cadastre o cliente, identifique o veículo e abra a ordem de serviço em uma única sequência. O calendário de agendamento entra como próxima etapa do fluxo.</p>
          </div>
          <div className="flex items-center gap-2 rounded-button border border-primary/15 bg-primary-subtle px-3 py-2 text-xs font-semibold text-primary-strong"><CalendarDays className="size-4" aria-hidden="true" /> Agendamento em breve</div>
        </div>

        <nav aria-label="Etapas do novo atendimento" className="mt-5 grid gap-2 sm:grid-cols-3">
          {STEPS.map((item, index) => {
            const Icon = item.icon;
            const active = step === item.id;
            const complete = step === 'done' || (item.id === 'customer' && Boolean(customer)) || (item.id === 'vehicle' && Boolean(vehicle));
            return <div key={item.id} className={`relative rounded-card border px-3 py-2.5 transition-colors ${active ? 'border-primary/40 bg-primary-subtle' : complete ? 'border-success/30 bg-success-subtle' : 'border-border bg-surface'}`}><div className="flex items-center gap-2.5"><span className={`flex size-8 shrink-0 items-center justify-center rounded-button ${active ? 'bg-primary text-primary-foreground' : complete ? 'bg-success text-white' : 'bg-muted text-text-muted'}`}>{complete ? <Check className="size-4" aria-hidden="true" /> : <Icon className="size-4" aria-hidden="true" />}</span><span><span className="block text-sm font-bold text-text">{index + 1}. {item.label}</span><span className="mt-0.5 block text-xs text-text-muted">{item.description}</span></span></div></div>;
          })}
        </nav>
      </section>

      {step === 'done' && serviceOrder ? (
        <Card className="border-success/30 bg-success-subtle">
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-success-strong"><Check className="size-5" aria-hidden="true" /><p className="font-bold">Atendimento iniciado com sucesso</p></div><p className="mt-2 text-sm text-text-muted">A OS de {serviceOrder.vehicleBrand} {serviceOrder.vehicleModel} já está disponível para sua equipe.</p></div><Button asChild><Link href={`/service-orders/${serviceOrder.id}`}>Abrir OS <ArrowRight className="size-4" aria-hidden="true" /></Link></Button></CardContent>
        </Card>
      ) : (
        <Card><CardContent className="grid gap-2 p-3 sm:grid-cols-2"><Summary label="Cliente" value={customer?.name} hint={customer ? 'Selecionado para esta OS' : 'Pesquise dentro do cadastro da OS'} icon={UserRound} /><Summary label="Veículo" value={vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Será selecionado na OS'} hint={vehicle?.plate ?? 'A busca será filtrada pelo cliente'} icon={CarFront} /></CardContent></Card>
      )}

      <CustomerFormModal presentation="page" open={step === 'customer'} onOpenChange={(open) => !open && closeCurrentStep()} onCreated={(created) => { advancing.current = true; setCustomer(created); setStep('order'); }} />
      <VehicleFormModal presentation="page" open={step === 'vehicle'} onOpenChange={(open) => !open && closeCurrentStep()} initialCustomer={customer ? { id: customer.id, name: customer.name } : undefined} onCreated={(created) => { advancing.current = true; setVehicle(created); setStep('order'); }} />
      <ServiceOrderFormModal presentation="page" open={step === 'order'} onOpenChange={(open) => !open && closeCurrentStep()} initialCustomer={customer ? { id: customer.id, name: customer.name } : undefined} initialVehicleId={vehicle?.id} initialVehicleLabel={vehicle ? `${vehicle.brand} ${vehicle.model} · ${vehicle.plate}` : undefined} onRequestNewCustomer={() => setStep('customer')} onRequestNewVehicle={() => setStep('vehicle')} onCreated={(created) => { advancing.current = true; setServiceOrder(created); setStep('done'); }} />
    </div>
  );
}

function Summary({ label, value, hint, icon: Icon }: { label: string; value?: string; hint: string; icon: typeof UserRound }) {
  return <div className="flex items-center gap-3 rounded-button border border-border bg-surface p-3"><span className="flex size-9 items-center justify-center rounded-button bg-muted text-text-muted"><Icon className="size-4" aria-hidden="true" /></span><span className="min-w-0"><span className="block text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</span><span className="mt-0.5 block truncate text-sm font-bold text-text">{value ?? 'Ainda não definido'}</span><span className="mt-0.5 block truncate text-xs text-text-muted">{hint}</span></span></div>;
}
