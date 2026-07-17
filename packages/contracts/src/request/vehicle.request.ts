import type { PageableRequest } from '../response/pagination.response';

export interface CreateVehicleRequest {
  customerId: string;
  brand: string;
  model: string;
  plate: string;
  year?: number;
  engine?: string;
  fuelType?: string;
  chassis?: string;
  mileage?: number;
  photos?: string[];
}

export interface UpdateVehicleRequest {
  id: string;
  brand?: string;
  model?: string;
  year?: number;
  engine?: string;
  fuelType?: string;
  plate?: string;
  chassis?: string;
  mileage?: number;
  photos?: string[];
}

export interface DeleteVehicleRequest {
  id: string;
}

export interface VehicleListRequest extends PageableRequest {
  search?: string;
  customerId?: string;
}
