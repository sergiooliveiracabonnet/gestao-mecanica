'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import type { CustomerAddress, CustomerListItemResponse } from '@oficina/contracts';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { extractErrorMessage, extractFieldErrors } from '@/lib/api/client';
import { useCreateCustomer, useUpdateCustomer } from '../hooks/use-customers';
import { CustomerGeneralTab } from './tabs/CustomerGeneralTab';
import { CustomerContactTab } from './tabs/CustomerContactTab';
import { CustomerPreferencesTab } from './tabs/CustomerPreferencesTab';
import { CustomerNotesTab } from './tabs/CustomerNotesTab';
import { CustomerHistoryTab } from './tabs/CustomerHistoryTab';

const addressSchema = z.object({
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
});

export const customerSchema = z.object({
  type: z.enum(['PF', 'PJ']),
  document: z.string().min(1, 'Informe o documento'),
  name: z.string().min(1, 'Informe o nome'),
  phone: z.string().min(1, 'Informe o telefone'),
  email: z.union([z.string().email('Informe um e-mail válido'), z.literal('')]).optional(),
  notes: z.string().optional(),
  address: addressSchema,
  // Feature 6 (Cadastro de Cliente Expandido) — todos opcionais.
  rg: z.string().optional(),
  stateRegistration: z.string().optional(),
  secondaryContactName: z.string().optional(),
  secondaryContactPhone: z.string().optional(),
  secondaryContactRelation: z.string().optional(),
  preferredContactChannel: z.enum(['PHONE', 'WHATSAPP', 'EMAIL', 'SMS']).optional(),
  preferredContactTime: z.enum(['MORNING', 'AFTERNOON', 'EVENING', 'ANY']).optional(),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

const EMPTY_ADDRESS: NonNullable<CustomerFormValues['address']> = {
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
};

const EMPTY_VALUES: CustomerFormValues = {
  type: 'PF',
  document: '',
  name: '',
  phone: '',
  email: '',
  notes: '',
  address: EMPTY_ADDRESS,
  rg: '',
  stateRegistration: '',
  secondaryContactName: '',
  secondaryContactPhone: '',
  secondaryContactRelation: '',
  preferredContactChannel: undefined,
  preferredContactTime: undefined,
};

// Campos em branco não devem virar `{ street: "", ... }` no payload — nem
// um objeto totalmente vazio quando o cliente não preencheu nenhum campo de
// endereço (o backend trata `undefined` como "não mudou", ver UpdateCustomerInput).
function buildAddressPayload(address: CustomerFormValues['address']): CustomerAddress | undefined {
  if (!address) {
    return undefined;
  }
  const entries = Object.entries(address).filter(([, value]) => Boolean(value));
  if (entries.length === 0) {
    return undefined;
  }
  return Object.fromEntries(entries) as CustomerAddress;
}

interface CustomerFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** undefined = modo criação, definido = modo edição (type/document viram somente leitura). */
  customer?: CustomerListItemResponse;
  onCreated?: (customer: CustomerListItemResponse) => void;
  presentation?: 'modal' | 'page';
}

export function CustomerFormModal({ open, onOpenChange, customer, onCreated, presentation = 'modal' }: CustomerFormModalProps) {
  const isEditing = Boolean(customer);
  const [activeTab, setActiveTab] = useState('general');
  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  const isPending = create.isPending || update.isPending;

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    setActiveTab('general');
    form.reset(
      customer
        ? {
            type: customer.type,
            document: customer.document,
            name: customer.name,
            phone: customer.phone,
            email: customer.email ?? '',
            notes: customer.notes ?? '',
            address: { ...EMPTY_ADDRESS, ...customer.address },
            rg: customer.rg ?? '',
            stateRegistration: customer.stateRegistration ?? '',
            secondaryContactName: customer.secondaryContactName ?? '',
            secondaryContactPhone: customer.secondaryContactPhone ?? '',
            secondaryContactRelation: customer.secondaryContactRelation ?? '',
            preferredContactChannel: customer.preferredContactChannel,
            preferredContactTime: customer.preferredContactTime,
          }
        : EMPTY_VALUES,
    );
  }, [open, customer, form]);

  function onSubmit(values: CustomerFormValues) {
    const onSuccess = (result?: { customer: CustomerListItemResponse }) => {
      if (!isEditing && result?.customer) onCreated?.(result.customer);
      toast.success(isEditing ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!');
      onOpenChange(false);
    };
    const onError = (error: unknown) => {
      const fieldErrors = extractFieldErrors(error);
      if (Object.keys(fieldErrors).length > 0) {
        Object.entries(fieldErrors).forEach(([field, message]) => {
          form.setError(field as keyof CustomerFormValues, { message });
        });
      } else {
        toast.error(extractErrorMessage(error));
      }
    };
    const address = buildAddressPayload(values.address);
    const sharedFields = {
      name: values.name,
      phone: values.phone,
      email: values.email || undefined,
      notes: values.notes || undefined,
      address,
      rg: values.rg || undefined,
      stateRegistration: values.stateRegistration || undefined,
      secondaryContactName: values.secondaryContactName || undefined,
      secondaryContactPhone: values.secondaryContactPhone || undefined,
      secondaryContactRelation: values.secondaryContactRelation || undefined,
      preferredContactChannel: values.preferredContactChannel,
      preferredContactTime: values.preferredContactTime,
    };

    if (isEditing && customer) {
      update.mutate({ id: customer.id, ...sharedFields }, { onSuccess, onError });
    } else {
      create.mutate({ type: values.type, document: values.document, ...sharedFields }, { onSuccess, onError });
    }
  }

  function onInvalid(errors: FieldErrors<CustomerFormValues>) {
    const firstPath = Object.keys(errors)[0] ?? '';
    if (firstPath.startsWith('address.') || ['type', 'document', 'name', 'phone', 'email', 'rg', 'stateRegistration'].includes(firstPath)) {
      setActiveTab('general');
    } else if (firstPath.startsWith('secondaryContact')) {
      setActiveTab('contact');
    } else if (firstPath.startsWith('preferredContact')) {
      setActiveTab('preferences');
    } else if (firstPath === 'notes') {
      setActiveTab('notes');
    }
  }

  const hasGeneralErrors = ['type', 'document', 'name', 'phone', 'email', 'rg', 'stateRegistration', 'address'].some((field) => Boolean(form.formState.errors[field as keyof CustomerFormValues]));
  const hasContactErrors = ['secondaryContactName', 'secondaryContactPhone', 'secondaryContactRelation'].some((field) => Boolean(form.formState.errors[field as keyof CustomerFormValues]));
  const hasPreferenceErrors = ['preferredContactChannel', 'preferredContactTime'].some((field) => Boolean(form.formState.errors[field as keyof CustomerFormValues]));
  const hasNotesErrors = Boolean(form.formState.errors.notes);

  return (
    <Dialog open={open} modal={presentation !== 'page'} onOpenChange={onOpenChange}>
      <DialogContent data-page={presentation === 'page' ? true : undefined} className={`max-h-[92vh] overflow-y-auto ${presentation === 'page' ? '' : 'sm:max-w-4xl lg:max-w-5xl'}`}>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar cliente' : 'Novo cliente'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Documento e tipo não podem ser alterados depois do cadastro.'
              : 'Cadastre um cliente pessoa física ou jurídica da sua oficina.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="flex flex-col gap-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex w-full justify-start gap-1 overflow-x-auto p-1">
                <TabsTrigger className="shrink-0" value="general">Dados Gerais{hasGeneralErrors && <AlertCircle className="ml-1.5 size-3.5 text-danger" aria-label="com erros" />}</TabsTrigger>
                <TabsTrigger className="shrink-0" value="contact">Contato{hasContactErrors && <AlertCircle className="ml-1.5 size-3.5 text-danger" aria-label="com erros" />}</TabsTrigger>
                <TabsTrigger className="shrink-0" value="preferences">Preferências{hasPreferenceErrors && <AlertCircle className="ml-1.5 size-3.5 text-danger" aria-label="com erros" />}</TabsTrigger>
                <TabsTrigger className="shrink-0" value="notes">Observações{hasNotesErrors && <AlertCircle className="ml-1.5 size-3.5 text-danger" aria-label="com erros" />}</TabsTrigger>
                <TabsTrigger className="shrink-0" value="history">Histórico</TabsTrigger>
              </TabsList>
              <TabsContent value="general">
                <CustomerGeneralTab form={form} isEditing={isEditing} />
              </TabsContent>
              <TabsContent value="contact">
                <CustomerContactTab form={form} />
              </TabsContent>
              <TabsContent value="preferences">
                <CustomerPreferencesTab form={form} />
              </TabsContent>
              <TabsContent value="notes">
                <CustomerNotesTab form={form} />
              </TabsContent>
              <TabsContent value="history">
                <CustomerHistoryTab customer={customer} />
              </TabsContent>
            </Tabs>
            <DialogFooter className="gap-2 border-t border-border pt-4 sm:gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="sm:min-w-40">
                {isPending ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar cliente'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
