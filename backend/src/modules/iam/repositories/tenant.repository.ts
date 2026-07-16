import { Injectable } from '@nestjs/common';
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

  async insert(input: CreateTenantInput) {
    return this.prisma.unscoped.tenant.create({
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
