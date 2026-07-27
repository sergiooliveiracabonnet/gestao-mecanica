export interface CompanySettingsResponse {
  name: string;
  legalName?: string;
  document: string;
  stateRegistration?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressDistrict?: string;
  addressCity?: string;
  addressState?: string;
  addressPostalCode?: string;
  logoDataUrl?: string;
  documentFooter?: string;
}

export interface EmailSettingsResponse {
  host?: string;
  port: number;
  secure: boolean;
  username?: string;
  passwordConfigured: boolean;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  enabled: boolean;
}

export interface TenantSettingsResponse {
  company: CompanySettingsResponse;
  email: EmailSettingsResponse;
}
