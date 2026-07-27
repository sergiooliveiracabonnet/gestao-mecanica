'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { VehicleSearchCombobox } from '@/features/vehicles/components/VehicleSearchCombobox';
import { useUsersList } from '@/features/users/hooks/use-users';
import { extractErrorMessage, extractFieldErrors } from '@/lib/api/client';
import { useCreateServiceOrder } from '../hooks/use-service-orders';

// Mesma limitação pragmática já aceita na Feature 4 pro seletor de técnico
// (lista fixa, sem busca). O de veículo agora usa VehicleSearchCombobox.
const PICKER_LIMIT = 100;

const serviceOrderSchema = z.object({
  vehicleId: z.string().min(1, 'Selecione um veículo'),
  technicianId: z.string().optional(),
  diagnosis: z.string().optional(),
});

type ServiceOrderFormValues = z.infer<typeof serviceOrderSchema>;

const EMPTY_VALUES: ServiceOrderFormValues = {
  vehicleId: '',
  technicianId: '',
  diagnosis: '',
};

interface ServiceOrderFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServiceOrderFormModal({ open, onOpenChange }: ServiceOrderFormModalProps) {
  const create = useCreateServiceOrder();

  const { data: usersData, isLoading: isLoadingTechnicians } = useUsersList({
    offset: 0,
    limit: PICKER_LIMIT,
    filters: { status: 'active' },
  });

  const form = useForm<ServiceOrderFormValues>({
    resolver: zodResolver(serviceOrderSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (open) {
      form.reset(EMPTY_VALUES);
    }
  }, [open, form]);

  function onSubmit(values: ServiceOrderFormValues) {
    create.mutate(
      {
        vehicleId: values.vehicleId,
        technicianId: values.technicianId || undefined,
        diagnosis: values.diagnosis || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Ordem de serviço aberta com sucesso!');
          onOpenChange(false);
        },
        onError: (error) => {
          const fieldErrors = extractFieldErrors(error);
          if (Object.keys(fieldErrors).length > 0) {
            Object.entries(fieldErrors).forEach(([field, message]) => {
              form.setError(field as keyof ServiceOrderFormValues, { message });
            });
          } else {
            toast.error(extractErrorMessage(error));
          }
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova ordem de serviço</DialogTitle>
          <DialogDescription>Abra uma OS vinculada a um veículo já cadastrado. O cliente é identificado automaticamente pelo dono do veículo.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="vehicleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Veículo</FormLabel>
                  <FormControl>
                    <VehicleSearchCombobox value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="technicianId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Técnico (opcional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingTechnicians ? 'Carregando técnicos...' : 'Atribuir depois'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {usersData?.items.map((technician) => (
                        <SelectItem key={technician.id} value={technician.id}>
                          {technician.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="diagnosis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Diagnóstico (opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descreva o problema relatado..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Abrindo...' : 'Abrir OS'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
