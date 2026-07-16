import { Injectable } from '@nestjs/common';
import type { PrismaClient } from '@oficina/database';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface CreateTenantInput {
  name: string;
  document: string;
  plan?: string;
  status?: string;
}

@Injectable()
export class TenantRepository {
  constructor(private readonly prisma: PrismaService) {}

  // `tx` opcional: usado pelo AuthManager.signup para rodar tenant+user na
  // mesma transação.
  async insert(input: CreateTenantInput, tx?: PrismaClient) {
    const db = tx ?? this.prisma.unscoped;
    return db.tenant.create({
      data: {
        name: input.name,
        document: input.document,
        plan: input.plan ?? 'free',
        status: input.status ?? 'active',
      },
    });
  }

  async byId(id: string) {
    return this.prisma.unscoped.tenant.findFirst({
      where: { id, deletedAt: null },
    });
  }

  // Global de propósito — checar unicidade de documento acontece antes de
  // qualquer tenant/usuário existir (signup).
  async byDocument(document: string) {
    return this.prisma.unscoped.tenant.findFirst({
      where: { document, deletedAt: null },
    });
  }
}
