import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthResponse, RefreshResponse, SignupResponse } from '@oficina/contracts';
import { Public } from '../../../shared/decorators/public.decorator';
import { AUTH_THROTTLE } from '../../../shared/constants/throttle.constants';
import { AuthManager } from '../managers/auth.manager';
import { LoginDto, LogoutDto, RefreshDto, SignupDto } from '../dto/auth.dto';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authManager: AuthManager) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('signup')
  async signup(@Body() body: SignupDto): Promise<SignupResponse> {
    return this.authManager.signup(body);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('login')
  async login(@Body() body: LoginDto): Promise<AuthResponse> {
    return this.authManager.login(body);
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() body: RefreshDto): Promise<RefreshResponse> {
    return this.authManager.refresh(body.refreshToken);
  }

  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@Body() body: LogoutDto): Promise<void> {
    await this.authManager.logout(body);
  }
}
