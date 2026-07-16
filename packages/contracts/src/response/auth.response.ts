import type { UserResponse } from './user.response';

export interface TenantResponse {
  id: string;
  name: string;
  document: string;
  plan: string;
  status: string;
  createdAt: string;
}

export interface TokenPairResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends TokenPairResponse {
  user: UserResponse;
}

export interface SignupResponse extends AuthResponse {
  tenant: TenantResponse;
}

export type RefreshResponse = TokenPairResponse;
