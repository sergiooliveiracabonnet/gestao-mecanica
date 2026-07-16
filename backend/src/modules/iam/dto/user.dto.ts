import { Type } from 'class-transformer';
import { IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, Max, Min, MinLength, ValidateNested } from 'class-validator';
import { USER_ROLES, USER_STATUSES } from '@oficina/contracts';
import type { AcceptInviteRequest, InviteUserRequest, UserListFilters, UserListRequest } from '@oficina/contracts';

const MIN_PASSWORD_LENGTH = 8;
const MAX_LIST_LIMIT = 100;
const DEFAULT_LIST_LIMIT = 100;

export class InviteUserDto implements InviteUserRequest {
  @IsEmail({}, { message: 'email must be a valid email' })
  email!: string;

  @IsNotEmpty({ message: 'name is required' })
  name!: string;

  @IsIn(USER_ROLES, { message: 'role must be one of ADMIN, MANAGER, MECHANIC, FRONT_DESK' })
  role!: InviteUserRequest['role'];
}

export class AcceptInviteDto implements AcceptInviteRequest {
  @IsNotEmpty({ message: 'invite_token is required' })
  inviteToken!: string;

  @MinLength(MIN_PASSWORD_LENGTH, { message: 'password must be at least 8 characters' })
  password!: string;
}

class UserListFiltersDto implements UserListFilters {
  @IsOptional()
  @IsIn(USER_STATUSES, { message: 'status must be one of active, invited, disabled' })
  status?: UserListFilters['status'];

  @IsOptional()
  @IsIn(USER_ROLES, { message: 'role must be one of ADMIN, MANAGER, MECHANIC, FRONT_DESK' })
  role?: UserListFilters['role'];
}

export class UserListDto implements UserListRequest {
  @IsOptional()
  @ValidateNested()
  @Type(() => UserListFiltersDto)
  filters?: UserListFilters;

  @IsInt()
  @Min(0)
  offset: number = 0;

  @IsInt()
  @Min(1)
  @Max(MAX_LIST_LIMIT)
  limit: number = DEFAULT_LIST_LIMIT;
}
