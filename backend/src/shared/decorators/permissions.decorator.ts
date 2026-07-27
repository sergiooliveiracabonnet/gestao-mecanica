import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from '@oficina/contracts';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: PermissionKey[]) => SetMetadata(PERMISSIONS_KEY, permissions);
