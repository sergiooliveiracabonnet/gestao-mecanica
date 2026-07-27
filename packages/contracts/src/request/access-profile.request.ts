import type { PermissionKey } from '../response/access-profile.response';

export interface CreateAccessProfileRequest {
  name: string;
  description?: string;
  permissions: PermissionKey[];
}

export interface UpdateAccessProfileRequest extends CreateAccessProfileRequest {
  id: string;
}

export interface AssignUserProfileRequest {
  userId: string;
  profileId: string;
}
