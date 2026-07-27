import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PermissionKey } from '@oficina/contracts';
import type { Request } from 'express';
import { RoleRepository } from '../../modules/iam/repositories/role.repository';
import { UserRepository } from '../../modules/iam/repositories/user.repository';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import type { AuthenticatedUser } from './jwt-auth.guard';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly roles: RoleRepository,
    private readonly users: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PermissionKey[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
    if (!required?.length) return true;
    const user = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>().user;
    const currentUser = user ? await this.users.byId(user.userId) : null;
    const currentRoleId = currentUser && currentUser.tenantId === user?.tenantId ? currentUser.roleId : user?.roleId;
    const permissions = currentRoleId
      ? await this.roles.permissionKeys(currentRoleId)
      : user?.permissions ?? [];
    if (!user || !required.every((permission) => permissions.includes(permission))) {
      throw new ForbiddenException('Seu perfil não tem permissão para executar esta ação.');
    }
    return true;
  }
}
