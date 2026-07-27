'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateVehicleRequest, DeleteVehicleRequest, UpdateVehicleRequest, VehicleListRequest } from '@oficina/contracts';
import { vehiclesApi } from '../api/vehicles-api';

const VEHICLES_LIST_KEY = 'vehicles-list';

// `enabled` (default true) — permite adiar a busca até um critério mínimo
// ser atingido (ex: VehicleSearchCombobox só busca com 2+ caracteres digitados),
// mesmo padrão de useFipeModels.
export function useVehiclesList(request: VehicleListRequest, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [VEHICLES_LIST_KEY, request],
    queryFn: () => vehiclesApi.list(request),
    placeholderData: (previousData) => previousData,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateVehicleRequest) => vehiclesApi.create(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [VEHICLES_LIST_KEY] });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateVehicleRequest) => vehiclesApi.update(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [VEHICLES_LIST_KEY] });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: DeleteVehicleRequest) => vehiclesApi.delete(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [VEHICLES_LIST_KEY] });
    },
  });
}
