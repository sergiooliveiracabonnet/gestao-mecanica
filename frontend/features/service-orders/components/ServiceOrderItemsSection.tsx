'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { ServiceOrderItemResponse, ServiceOrderItemType, ServiceOrderResponse } from '@oficina/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrencyBRL } from '@/lib/format-currency';
import { extractErrorMessage } from '@/lib/api/client';
import { useAddServiceOrderItem, useDeleteServiceOrderItem } from '../hooks/use-service-order-items';

const ITEM_TYPE_LABELS: Record<ServiceOrderItemType, string> = {
  PART: 'Peça',
  LABOR: 'Mão de obra',
};

interface ServiceOrderItemsSectionProps {
  serviceOrder: ServiceOrderResponse;
}

interface NewItemForm {
  type: ServiceOrderItemType;
  description: string;
  quantity: string;
  unitPrice: string;
}

const EMPTY_FORM: NewItemForm = { type: 'PART', description: '', quantity: '1', unitPrice: '' };

// Sem trava por status da OS (spec: itens editáveis em qualquer status,
// incluindo DELIVERED/CANCELLED) — este componente não checa serviceOrder.status.
export function ServiceOrderItemsSection({ serviceOrder }: ServiceOrderItemsSectionProps) {
  const [form, setForm] = useState<NewItemForm>(EMPTY_FORM);
  const addItem = useAddServiceOrderItem();
  const deleteItem = useDeleteServiceOrderItem(serviceOrder.id);

  const items = serviceOrder.items ?? [];

  function handleAdd() {
    const quantity = Number(form.quantity.replace(',', '.'));
    const unitPriceCents = Math.round(Number(form.unitPrice.replace(',', '.')) * 100);
    if (!form.description.trim() || !(quantity > 0) || Number.isNaN(unitPriceCents) || unitPriceCents < 0) {
      toast.error('Preencha descrição, quantidade e valor válidos.');
      return;
    }
    addItem.mutate(
      { serviceOrderId: serviceOrder.id, type: form.type, description: form.description.trim(), quantity, unitPriceCents },
      {
        onSuccess: () => {
          setForm(EMPTY_FORM);
          toast.success('Item adicionado.');
        },
        onError: (error) => toast.error(extractErrorMessage(error)),
      },
    );
  }

  function handleRemove(item: ServiceOrderItemResponse) {
    deleteItem.mutate(
      { id: item.id },
      {
        onSuccess: () => toast.success('Item removido.'),
        onError: (error) => toast.error(extractErrorMessage(error)),
      },
    );
  }

  return (
    <div className="rounded-card border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold tracking-tight text-text">Itens e valores</p>
          <p className="mt-1 text-sm text-text-muted">Peças e mão de obra lançadas nesta OS.</p>
        </div>
        <p className="text-xl font-bold text-text">{formatCurrencyBRL(serviceOrder.totalAmountCents)}</p>
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">Nenhum item lançado ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                <th className="py-2 pr-2">Tipo</th>
                <th className="py-2 pr-2">Descrição</th>
                <th className="py-2 pr-2 text-right">Qtd.</th>
                <th className="py-2 pr-2 text-right">Valor unit.</th>
                <th className="py-2 pr-2 text-right">Total</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="py-2 pr-2">{ITEM_TYPE_LABELS[item.type]}</td>
                  <td className="py-2 pr-2">{item.description}</td>
                  <td className="py-2 pr-2 text-right">{item.quantity}</td>
                  <td className="py-2 pr-2 text-right">{formatCurrencyBRL(item.unitPriceCents)}</td>
                  <td className="py-2 pr-2 text-right font-semibold">{formatCurrencyBRL(item.lineTotalCents)}</td>
                  <td className="py-2 text-right">
                    <Button variant="ghost" size="sm" disabled={deleteItem.isPending} onClick={() => handleRemove(item)}>
                      Remover
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Select value={form.type} onValueChange={(value) => setForm((prev) => ({ ...prev, type: value as ServiceOrderItemType }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PART">Peça</SelectItem>
            <SelectItem value="LABOR">Mão de obra</SelectItem>
          </SelectContent>
        </Select>
        <Input
          className="sm:col-span-2"
          placeholder="Descrição"
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
        />
        <Input placeholder="Qtd." value={form.quantity} onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))} />
        <Input
          placeholder="Valor unit. (R$)"
          value={form.unitPrice}
          onChange={(event) => setForm((prev) => ({ ...prev, unitPrice: event.target.value }))}
        />
      </div>
      <div className="mt-3 flex justify-end">
        <Button onClick={handleAdd} disabled={addItem.isPending}>
          {addItem.isPending ? 'Adicionando...' : 'Adicionar item'}
        </Button>
      </div>
    </div>
  );
}
