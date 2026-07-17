import type { PageableRequest } from '../response/pagination.response';
import type { CustomerAddress, CustomerContactChannel, CustomerContactTime, CustomerType } from '../response/customer.response';

export interface CreateCustomerRequest {
  type: CustomerType;
  document: string;
  name: string;
  phone: string;
  email?: string;
  address?: CustomerAddress;
  notes?: string;
  rg?: string;
  stateRegistration?: string;
  secondaryContactName?: string;
  secondaryContactPhone?: string;
  secondaryContactRelation?: string;
  preferredContactChannel?: CustomerContactChannel;
  preferredContactTime?: CustomerContactTime;
}

export interface UpdateCustomerRequest {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: CustomerAddress;
  notes?: string;
  rg?: string;
  stateRegistration?: string;
  secondaryContactName?: string;
  secondaryContactPhone?: string;
  secondaryContactRelation?: string;
  preferredContactChannel?: CustomerContactChannel;
  preferredContactTime?: CustomerContactTime;
}

export interface DeleteCustomerRequest {
  id: string;
}

export interface CustomerListRequest extends PageableRequest {
  search?: string;
}
