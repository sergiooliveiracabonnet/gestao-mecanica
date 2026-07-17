import { Injectable } from '@nestjs/common';
import type { FipeCategory } from '@oficina/contracts';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface CreateFipeBrandInput {
  category: FipeCategory;
  fipeCode: string;
  name: string;
  syncedAt: Date;
}

// `unscoped` de propósito: FipeBrand nunca entra em TENANT_SCOPED_MODELS
// (catálogo global, não é dado de tenant nenhum) — usar `client` aqui não
// mudaria o comportamento (a extensão só intercepta models listados), mas
// `unscoped` deixa a intenção explícita.
@Injectable()
export class FipeBrandRepository {
  constructor(private readonly prisma: PrismaService) {}

  // skipDuplicates: sincronização é sempre upsert-por-inserção — marcas já
  // existentes (mesma category+fipeCode) não são atualizadas. Ver Gotcha no
  // plano: se uma marca mudar de nome na FIPE, isso não reflete aqui.
  async createMany(rows: CreateFipeBrandInput[]): Promise<number> {
    if (rows.length === 0) {
      return 0;
    }
    const result = await this.prisma.unscoped.fipeBrand.createMany({ data: rows, skipDuplicates: true });
    return result.count;
  }

  async listByCategory(category: FipeCategory) {
    return this.prisma.unscoped.fipeBrand.findMany({
      where: { category },
      orderBy: { name: 'asc' },
    });
  }

  async byId(id: string) {
    return this.prisma.unscoped.fipeBrand.findFirst({ where: { id } });
  }

  async byIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }
    return this.prisma.unscoped.fipeBrand.findMany({ where: { id: { in: ids } } });
  }
}
