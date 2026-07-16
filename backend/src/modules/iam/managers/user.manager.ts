import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AcceptInviteRequest,
  AuthResponse,
  InviteUserRequest,
  InviteUserResponse,
  PaginationData,
  UserListItemResponse,
  UserListRequest,
  UserRole,
} from '@oficina/contracts';
import type { Role as RoleEntity, User as UserEntity } from '@oficina/database';
import { AppErrorCode } from '../../../shared/errors/app-error-code';
import { AppException } from '../../../shared/errors/app-exception';
import { AuditLogService } from '../../../shared/audit-log/audit-log.service';
import type { AuthenticatedUser } from '../../../shared/guards/jwt-auth.guard';
import { PasswordService } from '../services/password.service';
import { TokenService } from '../services/token.service';
import { RoleRepository } from '../repositories/role.repository';
import { UserRepository } from '../repositories/user.repository';

const DEFAULT_INVITE_TOKEN_TTL_SECONDS = 604800; // 7 dias
const DEFAULT_FRONTEND_URL = 'http://localhost:3000';

@Injectable()
export class UserManager {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly tokenService: TokenService,
    private readonly passwordService: PasswordService,
    private readonly auditLog: AuditLogService,
    private readonly config: ConfigService,
  ) {}

  async invite(actingUser: AuthenticatedUser, request: InviteUserRequest): Promise<InviteUserResponse> {
    // e-mail é único globalmente (não por tenant) — ver schema.prisma.
    const existingUser = await this.userRepository.byEmail(request.email);
    if (existingUser) {
      throw new AppException(AppErrorCode.EMAIL_ALREADY_EXISTS, 'Já existe uma conta com este e-mail.', HttpStatus.CONFLICT);
    }

    const role = await this.roleRepository.byName(request.role);
    if (!role) {
      throw new AppException(AppErrorCode.ROLE_NOT_FOUND, 'Papel inválido.', HttpStatus.BAD_REQUEST);
    }

    const ttlSeconds = this.config.get<number>('INVITE_TOKEN_TTL_SECONDS', DEFAULT_INVITE_TOKEN_TTL_SECONDS);
    const opaque = this.tokenService.generateOpaqueToken(ttlSeconds);

    const user = await this.userRepository.insert({
      tenantId: actingUser.tenantId,
      email: request.email,
      name: request.name,
      roleId: role.id,
      status: 'invited',
      inviteTokenHash: opaque.tokenHash,
      inviteExpiresAt: opaque.expiresAt,
    });

    await this.auditLog.record({
      tenantId: actingUser.tenantId,
      userId: actingUser.userId,
      action: 'user.invited',
      entity: 'user',
      entityId: user.id,
      metadata: { email: user.email, role: role.name },
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL', DEFAULT_FRONTEND_URL);

    return {
      user: this.toUserResponse(user, role),
      inviteLink: `${frontendUrl}/invite/${opaque.token}`,
    };
  }

  async acceptInvite(request: AcceptInviteRequest): Promise<AuthResponse> {
    const tokenHash = this.tokenService.hashToken(request.inviteToken);
    const user = await this.userRepository.byInviteTokenHash(tokenHash);

    if (!user) {
      throw new AppException(AppErrorCode.INVITE_TOKEN_INVALID, 'Convite inválido.', HttpStatus.BAD_REQUEST);
    }

    if (user.status !== 'invited') {
      throw new AppException(AppErrorCode.INVITE_ALREADY_ACCEPTED, 'Este convite já foi utilizado.', HttpStatus.BAD_REQUEST);
    }

    if (user.inviteExpiresAt && user.inviteExpiresAt.getTime() < Date.now()) {
      throw new AppException(AppErrorCode.INVITE_TOKEN_EXPIRED, 'Este convite expirou.', HttpStatus.BAD_REQUEST);
    }

    if (request.password.length < 8) {
      throw new AppException(AppErrorCode.VALIDATION_ERROR, 'A senha deve ter pelo menos 8 caracteres.');
    }

    const passwordHash = await this.passwordService.hash(request.password);
    await this.userRepository.update(user.id, {
      passwordHash,
      status: 'active',
      inviteTokenHash: null,
      inviteExpiresAt: null,
    });

    const role = await this.roleRepository.byId(user.roleId);
    if (!role) {
      throw new AppException(AppErrorCode.ROLE_NOT_FOUND, 'Papel do usuário não encontrado.', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const accessToken = await this.tokenService.signAccessToken({
      userId: user.id,
      tenantId: user.tenantId,
      role: role.name as UserRole,
    });
    const opaque = this.tokenService.generateRefreshToken();

    await this.auditLog.record({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'user.invite_accepted',
      entity: 'user',
      entityId: user.id,
      metadata: {},
    });

    return {
      accessToken,
      refreshToken: opaque.token,
      user: this.toUserResponse({ ...user, status: 'active' }, role),
    };
  }

  async list(request: UserListRequest): Promise<PaginationData<UserListItemResponse>> {
    const roles = await this.roleRepository.all();
    const roleByName = new Map(roles.map((role) => [role.name, role]));
    const roleFilterId = request.filters?.role ? roleByName.get(request.filters.role)?.id : undefined;

    const { items, total } = await this.userRepository.listByTenant(request.offset, request.limit, {
      status: request.filters?.status,
      roleId: roleFilterId,
    });

    const roleById = new Map(roles.map((role) => [role.id, role]));

    return {
      items: items.map((user) => {
        const role = roleById.get(user.roleId);
        if (!role) {
          throw new AppException(
            AppErrorCode.ROLE_NOT_FOUND,
            `Usuário ${user.id} referencia um papel inexistente.`,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
        return this.toUserResponse(user, role);
      }),
      total,
      offset: request.offset,
      limit: request.limit,
      hasMore: request.offset + items.length < total,
    };
  }

  private toUserResponse(user: UserEntity, role: RoleEntity): UserListItemResponse {
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: role.name as UserRole,
      status: user.status as UserListItemResponse['status'],
      createdAt: user.createdAt.toISOString(),
    };
  }
}
