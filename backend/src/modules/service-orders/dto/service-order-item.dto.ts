import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { SERVICE_ORDER_ITEM_TYPES } from '@oficina/contracts';
import type {
  CreateServiceOrderItemRequest,
  DeleteServiceOrderItemRequest,
  UpdateServiceOrderItemRequest,
} from '@oficina/contracts';

const MIN_QUANTITY = 0.01;

export class CreateServiceOrderItemDto implements CreateServiceOrderItemRequest {
  @IsUUID('4', { message: 'service_order_id must be a valid id' })
  serviceOrderId!: string;

  @IsIn(SERVICE_ORDER_ITEM_TYPES, { message: 'type must be PART or LABOR' })
  type!: CreateServiceOrderItemRequest['type'];

  @IsNotEmpty({ message: 'description is required' })
  description!: string;

  @IsNumber({}, { message: 'quantity must be a number' })
  @Min(MIN_QUANTITY, { message: 'quantity must be greater than zero' })
  quantity!: number;

  @IsInt({ message: 'unit_price_cents must be an integer' })
  @Min(0, { message: 'unit_price_cents cannot be negative' })
  unitPriceCents!: number;
}

export class UpdateServiceOrderItemDto implements UpdateServiceOrderItemRequest {
  @IsNotEmpty({ message: 'id is required' })
  @IsUUID('4', { message: 'id must be a valid id' })
  id!: string;

  @IsOptional()
  @IsIn(SERVICE_ORDER_ITEM_TYPES, { message: 'type must be PART or LABOR' })
  type?: UpdateServiceOrderItemRequest['type'];

  @IsOptional()
  @IsNotEmpty({ message: 'description cannot be empty' })
  description?: string;

  @IsOptional()
  @IsNumber({}, { message: 'quantity must be a number' })
  @Min(MIN_QUANTITY, { message: 'quantity must be greater than zero' })
  quantity?: number;

  @IsOptional()
  @IsInt({ message: 'unit_price_cents must be an integer' })
  @Min(0, { message: 'unit_price_cents cannot be negative' })
  unitPriceCents?: number;
}

export class DeleteServiceOrderItemDto implements DeleteServiceOrderItemRequest {
  @IsNotEmpty({ message: 'id is required' })
  @IsUUID('4', { message: 'id must be a valid id' })
  id!: string;
}
