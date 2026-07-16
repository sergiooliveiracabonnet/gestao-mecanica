export const USER_ROLES = ['ADMIN', 'MANAGER', 'MECHANIC', 'FRONT_DESK'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['active', 'invited', 'disabled'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export interface UserResponse {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export type UserListItemResponse = UserResponse;

export interface InviteUserResponse {
  user: UserResponse;
  /** Só presente nesta feature enquanto não há provedor de e-mail real — uso em dev/QA. */
  inviteLink: string;
}
