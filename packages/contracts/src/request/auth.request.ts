export interface SignupRequest {
  tenantName: string;
  tenantDocument: string;
  adminName: string;
  adminEmail: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}
