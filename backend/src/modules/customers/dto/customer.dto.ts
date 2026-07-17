import { IsEmail, IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { CUSTOMER_CONTACT_CHANNELS, CUSTOMER_CONTACT_TIMES, CUSTOMER_TYPES } from '@oficina/contracts';
import type {
  CreateCustomerRequest,
  CustomerAddress,
  CustomerContactChannel,
  CustomerContactTime,
  CustomerListRequest,
  DeleteCustomerRequest,
  UpdateCustomerRequest,
} from '@oficina/contracts';

const MAX_LIST_LIMIT = 100;
const DEFAULT_LIST_LIMIT = 100;

export class CreateCustomerDto implements CreateCustomerRequest {
  @IsIn(CUSTOMER_TYPES, { message: 'type must be one of PF, PJ' })
  type!: CreateCustomerRequest['type'];

  @IsNotEmpty({ message: 'document is required' })
  document!: string;

  @IsNotEmpty({ message: 'name is required' })
  name!: string;

  @IsNotEmpty({ message: 'phone is required' })
  phone!: string;

  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid email' })
  email?: string;

  @IsOptional()
  @IsObject()
  address?: CustomerAddress;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  rg?: string;

  @IsOptional()
  @IsString()
  stateRegistration?: string;

  @IsOptional()
  @IsString()
  secondaryContactName?: string;

  @IsOptional()
  @IsString()
  secondaryContactPhone?: string;

  @IsOptional()
  @IsString()
  secondaryContactRelation?: string;

  @IsOptional()
  @IsIn(CUSTOMER_CONTACT_CHANNELS, { message: 'preferred_contact_channel must be one of PHONE, WHATSAPP, EMAIL, SMS' })
  preferredContactChannel?: CustomerContactChannel;

  @IsOptional()
  @IsIn(CUSTOMER_CONTACT_TIMES, { message: 'preferred_contact_time must be one of MORNING, AFTERNOON, EVENING, ANY' })
  preferredContactTime?: CustomerContactTime;
}

export class UpdateCustomerDto implements UpdateCustomerRequest {
  @IsNotEmpty({ message: 'id is required' })
  @IsUUID('4', { message: 'id must be a valid id' })
  id!: string;

  @IsOptional()
  @IsNotEmpty({ message: 'name cannot be empty' })
  name?: string;

  @IsOptional()
  @IsNotEmpty({ message: 'phone cannot be empty' })
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid email' })
  email?: string;

  @IsOptional()
  @IsObject()
  address?: CustomerAddress;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  rg?: string;

  @IsOptional()
  @IsString()
  stateRegistration?: string;

  @IsOptional()
  @IsString()
  secondaryContactName?: string;

  @IsOptional()
  @IsString()
  secondaryContactPhone?: string;

  @IsOptional()
  @IsString()
  secondaryContactRelation?: string;

  @IsOptional()
  @IsIn(CUSTOMER_CONTACT_CHANNELS, { message: 'preferred_contact_channel must be one of PHONE, WHATSAPP, EMAIL, SMS' })
  preferredContactChannel?: CustomerContactChannel;

  @IsOptional()
  @IsIn(CUSTOMER_CONTACT_TIMES, { message: 'preferred_contact_time must be one of MORNING, AFTERNOON, EVENING, ANY' })
  preferredContactTime?: CustomerContactTime;
}

export class DeleteCustomerDto implements DeleteCustomerRequest {
  @IsNotEmpty({ message: 'id is required' })
  @IsUUID('4', { message: 'id must be a valid id' })
  id!: string;
}

export class GetCustomerDto {
  @IsNotEmpty({ message: 'id is required' })
  @IsUUID('4', { message: 'id must be a valid id' })
  id!: string;
}

export class CustomerListDto implements CustomerListRequest {
  @IsOptional()
  @IsString()
  search?: string;

  @IsInt()
  @Min(0)
  offset: number = 0;

  @IsInt()
  @Min(1)
  @Max(MAX_LIST_LIMIT)
  limit: number = DEFAULT_LIST_LIMIT;
}
