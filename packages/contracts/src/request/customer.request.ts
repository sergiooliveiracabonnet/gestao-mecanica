import type { PageableRequest } from '../response/pagination.response';
import type { CustomerAddress, CustomerType } from '../response/customer.response';

export interface CreateCustomerRequest {
  type: CustomerType;
  document: string;
  name: string;
  phone: string;
  email?: string;
  address?: CustomerAddress;
  notes?: string;
}

export interface UpdateCustomerRequest {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: CustomerAddress;
  notes?: string;
}

export interface DeleteCustomerRequest {
  id: string;
}

export interface CustomerListRequest extends PageableRequest {
  search?: string;
}
