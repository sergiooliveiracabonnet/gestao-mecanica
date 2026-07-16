import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface CreateUserInput {
  tenantId: string;
  email: string;
  name: string;
  roleId: string;
  status: 'active' | 'invited';
  passwordHash?: string;
  inviteTokenHash?: string;
  inviteExpiresAt?: Date;
}

export interface UpdateUserInput {
  passwordHash?: string;
  status?: 'active' | 'invited' | 'disabled';
  inviteTokenHash?: string | null;
  inviteExpiresAt?: Date | null;
}

export interface ListUsersFilters {
  status?: string;
  roleId?: string;
}

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Passa por `client`: se houver tenant context ativo (convite feito por um
  // Admin autenticado), a extensão injeta o tenant_id do Admin no `create` —
  // exatamente o comportamento desejado. No signup (sem context ainda), o
  // Manager passa `tenantId` explicitamente no input.
  async insert(input: CreateUserInput) {
    return this.prisma.client.user.create({
      data: {
        tenantId: input.tenantId,
        email: input.email,
        name: input.name,
        roleId: input.roleId,
        status: input.status,
        passwordHash: input.passwordHash,
        inviteTokenHash: input.inviteTokenHash,
        inviteExpiresAt: input.inviteExpiresAt,
      },
    });
  }

  async byId(id: string) {
    return this.prisma.client.user.findFirst({
      where: { id, deletedAt: null },
    });
  }

  // Global de propósito — usado no login (sem tenant context ainda) e na
  // checagem de unicidade do convite (email é único globalmente, não por
  // tenant; ver schema.prisma).
  async byEmail(email: string) {
    return this.prisma.unscoped.user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  // Global de propósito — accept-invite acontece sem o usuário autenticado.
  async byInviteTokenHash(inviteTokenHash: string) {
    return this.prisma.unscoped.user.findFirst({
      where: { inviteTokenHash, deletedAt: null },
    });
  }

  async update(id: string, patch: UpdateUserInput) {
    return this.prisma.client.user.updateMany({
      where: { id, deletedAt: null },
      data: patch,
    });
  }

  async listByTenant(offset: number, limit: number, filters?: ListUsersFilters) {
    const where = {
      deletedAt: null,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.roleId ? { roleId: filters.roleId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.client.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.client.user.count({ where }),
    ]);

    return { items, total };
  }
}
