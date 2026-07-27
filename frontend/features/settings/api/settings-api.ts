import type { CompanySettingsResponse, EmailSettingsResponse, SendEmailRequest, TestEmailSettingsRequest, TenantSettingsResponse, UpdateCompanySettingsRequest, UpdateEmailSettingsRequest } from '@oficina/contracts';
import { apiClient } from '@/lib/api/client';

export const settingsApi = {
  async get(): Promise<TenantSettingsResponse> {
    return (await apiClient.get<TenantSettingsResponse>('/api/v1/settings')).data;
  },
  async branding(): Promise<{ company: CompanySettingsResponse }> {
    return (await apiClient.get<{ company: CompanySettingsResponse }>('/api/v1/settings/branding')).data;
  },
  async updateCompany(request: UpdateCompanySettingsRequest): Promise<{ company: CompanySettingsResponse }> {
    return (await apiClient.post('/api/v1/settings/company', request)).data;
  },
  async updateEmail(request: UpdateEmailSettingsRequest): Promise<{ email: EmailSettingsResponse }> {
    return (await apiClient.post('/api/v1/settings/email', request)).data;
  },
  async testEmail(request: TestEmailSettingsRequest): Promise<{ sent: boolean }> {
    return (await apiClient.post('/api/v1/settings/email/test', request)).data;
  },
  async sendEmail(request: SendEmailRequest): Promise<{ sent: boolean }> {
    return (await apiClient.post('/api/v1/settings/email/send', request)).data;
  },
};
