import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import type {
  CreateVehicleRequest,
  DeleteVehicleRequest,
  UpdateVehicleRequest,
  VehicleListRequest,
} from '@oficina/contracts';

const MAX_LIST_LIMIT = 100;
const DEFAULT_LIST_LIMIT = 100;
const MAX_PHOTOS = 20;

export class CreateVehicleDto implements CreateVehicleRequest {
  @IsUUID('4', { message: 'customer_id must be a valid id' })
  customerId!: string;

  @IsNotEmpty({ message: 'brand is required' })
  brand!: string;

  @IsNotEmpty({ message: 'model is required' })
  model!: string;

  @IsNotEmpty({ message: 'plate is required' })
  plate!: string;

  @IsOptional()
  @IsInt()
  year?: number;

  @IsOptional()
  @IsString()
  engine?: string;

  @IsOptional()
  @IsString()
  fuelType?: string;

  @IsOptional()
  @IsString()
  chassis?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_PHOTOS)
  @IsString({ each: true })
  photos?: string[];
}

export class UpdateVehicleDto implements UpdateVehicleRequest {
  @IsNotEmpty({ message: 'id is required' })
  @IsUUID('4', { message: 'id must be a valid id' })
  id!: string;

  @IsOptional()
  @IsNotEmpty({ message: 'brand cannot be empty' })
  brand?: string;

  @IsOptional()
  @IsNotEmpty({ message: 'model cannot be empty' })
  model?: string;

  @IsOptional()
  @IsNotEmpty({ message: 'plate cannot be empty' })
  plate?: string;

  @IsOptional()
  @IsInt()
  year?: number;

  @IsOptional()
  @IsString()
  engine?: string;

  @IsOptional()
  @IsString()
  fuelType?: string;

  @IsOptional()
  @IsString()
  chassis?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_PHOTOS)
  @IsString({ each: true })
  photos?: string[];
}

export class DeleteVehicleDto implements DeleteVehicleRequest {
  @IsNotEmpty({ message: 'id is required' })
  @IsUUID('4', { message: 'id must be a valid id' })
  id!: string;
}

export class GetVehicleDto {
  @IsNotEmpty({ message: 'id is required' })
  @IsUUID('4', { message: 'id must be a valid id' })
  id!: string;
}

export class VehicleListDto implements VehicleListRequest {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID('4', { message: 'customer_id must be a valid id' })
  customerId?: string;

  @IsOptional()
  @IsBoolean()
  matchOwner?: boolean;

  @IsInt()
  @Min(0)
  offset: number = 0;

  @IsInt()
  @Min(1)
  @Max(MAX_LIST_LIMIT)
  limit: number = DEFAULT_LIST_LIMIT;
}
