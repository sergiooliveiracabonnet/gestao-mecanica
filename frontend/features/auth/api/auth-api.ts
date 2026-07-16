import { apiClient } from '@/lib/api/client';
import type {
  AuthResponse,
  LoginRequest,
  LogoutRequest,
  RefreshRequest,
  RefreshResponse,
  SignupRequest,
  SignupResponse,
} from '@oficina/contracts';

export const authApi = {
  async signup(request: SignupRequest): Promise<SignupResponse> {
    const response = await apiClient.post<SignupResponse>('/api/v1/auth/signup', request);
    return response.data;
  },

  async login(request: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/api/v1/auth/login', request);
    return response.data;
  },

  async refresh(request: RefreshRequest): Promise<RefreshResponse> {
    const response = await apiClient.post<RefreshResponse>('/api/v1/auth/refresh', request);
    return response.data;
  },

  async logout(request: LogoutRequest): Promise<void> {
    await apiClient.post('/api/v1/auth/logout', request);
  },
};
