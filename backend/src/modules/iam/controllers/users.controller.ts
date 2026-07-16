import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthResponse, InviteUserResponse, PaginationData, UserListItemResponse } from '@oficina/contracts';
import { Public } from '../../../shared/decorators/public.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { AUTH_THROTTLE } from '../../../shared/constants/throttle.constants';
import type { AuthenticatedUser } from '../../../shared/guards/jwt-auth.guard';
import { UserManager } from '../managers/user.manager';
import { AcceptInviteDto, InviteUserDto, UserListDto } from '../dto/user.dto';

@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly userManager: UserManager) {}

  @Roles('ADMIN', 'MANAGER')
  @Post('invite')
  async invite(@CurrentUser() actingUser: AuthenticatedUser, @Body() body: InviteUserDto): Promise<InviteUserResponse> {
    return this.userManager.invite(actingUser, body);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('accept-invite')
  async acceptInvite(@Body() body: AcceptInviteDto): Promise<AuthResponse> {
    return this.userManager.acceptInvite(body);
  }

  @Roles('ADMIN', 'MANAGER')
  @Post('list')
  async list(@Body() body: UserListDto): Promise<PaginationData<UserListItemResponse>> {
    return this.userManager.list(body);
  }
}
