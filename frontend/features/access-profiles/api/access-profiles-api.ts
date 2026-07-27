import type { AccessProfileResponse, AssignUserProfileRequest, CreateAccessProfileRequest, UpdateAccessProfileRequest } from '@oficina/contracts';
import { apiClient } from '@/lib/api/client';

export const accessProfilesApi = {
  async list(): Promise<{ items: AccessProfileResponse[] }> {
    return (await apiClient.get('/api/v1/access-profiles')).data;
  },
  async create(input: CreateAccessProfileRequest): Promise<{ profile: AccessProfileResponse }> {
    return (await apiClient.post('/api/v1/access-profiles', input)).data;
  },
  async update(input: UpdateAccessProfileRequest): Promise<{ profile: AccessProfileResponse }> {
    return (await apiClient.post('/api/v1/access-profiles/update', input)).data;
  },
  async assign(input: AssignUserProfileRequest): Promise<{ success: true }> {
    return (await apiClient.post('/api/v1/access-profiles/assign', input)).data;
  },
};
