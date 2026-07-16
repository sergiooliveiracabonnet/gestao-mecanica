import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '@oficina/contracts';
import type { LoginRequest, LogoutRequest, RefreshRequest, SignupRequest } from '@oficina/contracts';

export class SignupDto implements SignupRequest {
  @IsNotEmpty({ message: 'tenant_name is required' })
  tenantName!: string;

  @IsNotEmpty({ message: 'tenant_document is required' })
  tenantDocument!: string;

  @IsNotEmpty({ message: 'admin_name is required' })
  adminName!: string;

  @IsEmail({}, { message: 'admin_email must be a valid email' })
  adminEmail!: string;

  @MinLength(MIN_PASSWORD_LENGTH, { message: `password must be at least ${MIN_PASSWORD_LENGTH} characters` })
  password!: string;
}

export class LoginDto implements LoginRequest {
  @IsEmail({}, { message: 'email must be a valid email' })
  email!: string;

  @IsNotEmpty({ message: 'password is required' })
  password!: string;
}

export class RefreshDto implements RefreshRequest {
  @IsNotEmpty({ message: 'refresh_token is required' })
  refreshToken!: string;
}

export class LogoutDto implements LogoutRequest {
  @IsNotEmpty({ message: 'refresh_token is required' })
  refreshToken!: string;
}
