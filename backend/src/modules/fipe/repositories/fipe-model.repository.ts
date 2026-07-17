import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface CreateFipeModelInput {
  brandId: string;
  fipeCode: string;
  name: string;
  syncedAt: Date;
}

// `unscoped` de propósito — ver comentário em fipe-brand.repository.ts.
@Injectable()
export class FipeModelRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(rows: CreateFipeModelInput[]): Promise<number> {
    if (rows.length === 0) {
      return 0;
    }
    const result = await this.prisma.unscoped.fipeModel.createMany({ data: rows, skipDuplicates: true });
    return result.count;
  }

  async listByBrandId(brandId: string) {
    return this.prisma.unscoped.fipeModel.findMany({
      where: { brandId },
      orderBy: { name: 'asc' },
    });
  }

  async byId(id: string) {
    return this.prisma.unscoped.fipeModel.findFirst({ where: { id } });
  }
}
