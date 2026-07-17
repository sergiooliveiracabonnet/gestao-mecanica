'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import type { CustomerAddress, CustomerListItemResponse } from '@oficina/contracts';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
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
}

export function CustomerFormModal({ open, onOpenChange, customer }: CustomerFormModalProps) {
  const isEditing = Boolean(customer);
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
    const onSuccess = () => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl lg:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar cliente' : 'Novo cliente'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Documento e tipo não podem ser alterados depois do cadastro.'
              : 'Cadastre um cliente pessoa física ou jurídica da sua oficina.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Tabs defaultValue="general">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="general">Dados Gerais</TabsTrigger>
                <TabsTrigger value="contact">Contato</TabsTrigger>
                <TabsTrigger value="preferences">Preferências</TabsTrigger>
                <TabsTrigger value="notes">Observações</TabsTrigger>
                <TabsTrigger value="history">Histórico</TabsTrigger>
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
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar cliente'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
