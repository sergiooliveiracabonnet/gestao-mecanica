export interface VehicleResponse {
  id: string;
  tenantId: string;
  customerId: string;
  // Denormalizado pelo Manager pra evitar que a UI precise resolver o nome
  // do dono a partir do id em toda tela que lista veículos (ver
  // VehicleManager.toResponse).
  customerName: string;
  brand: string;
  model: string;
  year?: number;
  engine?: string;
  fuelType?: string;
  plate: string;
  chassis?: string;
  mileage?: number;
  photos: string[];
  createdAt: string;
}

export type VehicleListItemResponse = VehicleResponse;
