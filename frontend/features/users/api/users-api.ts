import { apiClient } from '@/lib/api/client';
import type {
  AcceptInviteRequest,
  AuthResponse,
  InviteUserRequest,
  InviteUserResponse,
  PaginationData,
  UserListItemResponse,
  UserListRequest,
} from '@oficina/contracts';

export const usersApi = {
  async invite(request: InviteUserRequest): Promise<InviteUserResponse> {
    const response = await apiClient.post<InviteUserResponse>('/api/v1/users/invite', request);
    return response.data;
  },

  async acceptInvite(request: AcceptInviteRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/api/v1/users/accept-invite', request);
    return response.data;
  },

  async list(request: UserListRequest): Promise<PaginationData<UserListItemResponse>> {
    const response = await apiClient.post<PaginationData<UserListItemResponse>>('/api/v1/users/list', request);
    return response.data;
  },
};
