'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateVehicleRequest, DeleteVehicleRequest, UpdateVehicleRequest, VehicleListRequest } from '@oficina/contracts';
import { vehiclesApi } from '../api/vehicles-api';

const VEHICLES_LIST_KEY = 'vehicles-list';

export function useVehiclesList(request: VehicleListRequest) {
  return useQuery({
    queryKey: [VEHICLES_LIST_KEY, request],
    queryFn: () => vehiclesApi.list(request),
    placeholderData: (previousData) => previousData,
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
