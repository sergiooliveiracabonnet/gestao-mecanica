'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import type { VehicleListItemResponse } from '@oficina/contracts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCustomersList } from '@/features/customers/hooks/use-customers';
import { extractErrorMessage, extractFieldErrors } from '@/lib/api/client';
import { useCreateVehicle, useUpdateVehicle } from '../hooks/use-vehicles';

// Sem lib de combobox nova nesta feature — o Select nativo populado com os
// primeiros 100 clientes é uma limitação conhecida, aceita pro MVP (ver
// plan veiculos-crud-vinculado-cliente.md, Gotcha do seletor de cliente).
const CUSTOMER_PICKER_LIMIT = 100;

const vehicleSchema = z.object({
  customerId: z.string().min(1, 'Selecione um cliente'),
  brand: z.string().min(1, 'Informe a marca'),
  model: z.string().min(1, 'Informe o modelo'),
  plate: z.string().min(1, 'Informe a placa'),
  year: z.string().optional(),
  engine: z.string().optional(),
  fuelType: z.string().optional(),
  chassis: z.string().optional(),
  mileage: z.string().optional(),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

const EMPTY_VALUES: VehicleFormValues = {
  customerId: '',
  brand: '',
  model: '',
  plate: '',
  year: '',
  engine: '',
  fuelType: '',
  chassis: '',
  mileage: '',
};

function toOptionalNumber(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

interface VehicleFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** undefined = modo criação, definido = modo edição (cliente vira somente leitura). */
  vehicle?: VehicleListItemResponse;
}

export function VehicleFormModal({ open, onOpenChange, vehicle }: VehicleFormModalProps) {
  const isEditing = Boolean(vehicle);
  const create = useCreateVehicle();
  const update = useUpdateVehicle();
  const isPending = create.isPending || update.isPending;

  // Só busca a lista de clientes quando o modal de criação está aberto —
  // em edição o cliente não é selecionável, não precisa da query.
  const { data: customersData, isLoading: isLoadingCustomers } = useCustomersList({ offset: 0, limit: CUSTOMER_PICKER_LIMIT });

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    form.reset(
      vehicle
        ? {
            customerId: vehicle.customerId,
            brand: vehicle.brand,
            model: vehicle.model,
            plate: vehicle.plate,
            year: vehicle.year?.toString() ?? '',
            engine: vehicle.engine ?? '',
            fuelType: vehicle.fuelType ?? '',
            chassis: vehicle.chassis ?? '',
            mileage: vehicle.mileage?.toString() ?? '',
          }
        : EMPTY_VALUES,
    );
  }, [open, vehicle, form]);

  function onSubmit(values: VehicleFormValues) {
    const onSuccess = () => {
      toast.success(isEditing ? 'Veículo atualizado com sucesso!' : 'Veículo cadastrado com sucesso!');
      onOpenChange(false);
    };
    const onError = (error: unknown) => {
      const fieldErrors = extractFieldErrors(error);
      if (Object.keys(fieldErrors).length > 0) {
        Object.entries(fieldErrors).forEach(([field, message]) => {
          form.setError(field as keyof VehicleFormValues, { message });
        });
      } else {
        toast.error(extractErrorMessage(error));
      }
    };

    const commonFields = {
      brand: values.brand,
      model: values.model,
      plate: values.plate,
      year: toOptionalNumber(values.year),
      engine: values.engine || undefined,
      fuelType: values.fuelType || undefined,
      chassis: values.chassis || undefined,
      mileage: toOptionalNumber(values.mileage),
    };

    if (isEditing && vehicle) {
      update.mutate({ id: vehicle.id, ...commonFields }, { onSuccess, onError });
    } else {
      create.mutate({ customerId: values.customerId, ...commonFields }, { onSuccess, onError });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar veículo' : 'Novo veículo'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'O cliente dono do veículo não pode ser alterado.' : 'Cadastre um veículo vinculado a um cliente da sua oficina.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {isEditing ? (
              // Sem FormField/FormLabel aqui de propósito: não há campo do
              // react-hook-form associado (customerId não é editável) — os
              // primitivos do Form exigem contexto de um FormField
              // (useFormField lança fora dele).
              <div className="space-y-2">
                <p className="text-sm font-medium text-text">Cliente</p>
                <p className="rounded-button border border-input bg-muted px-3 py-2 text-sm text-text-muted">{vehicle?.customerName}</p>
              </div>
            ) : (
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingCustomers ? 'Carregando clientes...' : 'Escolha um cliente'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customersData?.items.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <FormControl>
                      <Input placeholder="Fiat" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <FormControl>
                      <Input placeholder="Uno" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="plate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Placa</FormLabel>
                    <FormControl>
                      <Input placeholder="ABC1D23" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ano (opcional)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="2020" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="engine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motor (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="1.0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fuelType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Combustível (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Flex" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="chassis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chassi (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="9BW..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mileage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quilometragem (opcional)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="42000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar veículo'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
