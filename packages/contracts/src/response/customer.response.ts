export const CUSTOMER_TYPES = ['PF', 'PJ'] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export interface CustomerAddress {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface CustomerResponse {
  id: string;
  tenantId: string;
  type: CustomerType;
  document: string;
  name: string;
  email?: string;
  phone: string;
  address?: CustomerAddress;
  notes?: string;
  createdAt: string;
}

export type CustomerListItemResponse = CustomerResponse;
