import { IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { SERVICE_ORDER_STATUSES } from '@oficina/contracts';
import type {
  CreateServiceOrderRequest,
  DeleteServiceOrderRequest,
  ServiceOrderListRequest,
  TransitionServiceOrderRequest,
  UpdateServiceOrderRequest,
} from '@oficina/contracts';

const MAX_LIST_LIMIT = 100;
const DEFAULT_LIST_LIMIT = 100;

export class CreateServiceOrderDto implements CreateServiceOrderRequest {
  @IsUUID('4', { message: 'vehicle_id must be a valid id' })
  vehicleId!: string;

  @IsOptional()
  @IsUUID('4', { message: 'technician_id must be a valid id' })
  technicianId?: string;

  @IsOptional()
  @IsObject({ message: 'checklist must be a valid JSON object' })
  checklist?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  diagnosis?: string;
}

export class UpdateServiceOrderDto implements UpdateServiceOrderRequest {
  @IsNotEmpty({ message: 'id is required' })
  @IsUUID('4', { message: 'id must be a valid id' })
  id!: string;

  @IsOptional()
  @IsUUID('4', { message: 'technician_id must be a valid id' })
  technicianId?: string;

  @IsOptional()
  @IsObject({ message: 'checklist must be a valid JSON object' })
  checklist?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  diagnosis?: string;
}

export class TransitionServiceOrderDto implements TransitionServiceOrderRequest {
  @IsNotEmpty({ message: 'id is required' })
  @IsUUID('4', { message: 'id must be a valid id' })
  id!: string;

  @IsIn(SERVICE_ORDER_STATUSES, { message: 'to_status must be a valid status' })
  toStatus!: TransitionServiceOrderRequest['toStatus'];
}

export class DeleteServiceOrderDto implements DeleteServiceOrderRequest {
  @IsNotEmpty({ message: 'id is required' })
  @IsUUID('4', { message: 'id must be a valid id' })
  id!: string;
}

export class GetServiceOrderDto {
  @IsNotEmpty({ message: 'id is required' })
  @IsUUID('4', { message: 'id must be a valid id' })
  id!: string;
}

export class ServiceOrderListDto implements ServiceOrderListRequest {
  @IsOptional()
  @IsIn(SERVICE_ORDER_STATUSES, { message: 'status must be a valid status' })
  status?: ServiceOrderListRequest['status'];

  @IsOptional()
  @IsUUID('4', { message: 'vehicle_id must be a valid id' })
  vehicleId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'technician_id must be a valid id' })
  technicianId?: string;

  @IsInt()
  @Min(0)
  offset: number = 0;

  @IsInt()
  @Min(1)
  @Max(MAX_LIST_LIMIT)
  limit: number = DEFAULT_LIST_LIMIT;
}
