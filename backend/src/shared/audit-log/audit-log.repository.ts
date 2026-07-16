import { Injectable } from '@nestjs/common';
import type { Prisma } from '@oficina/database';
import { PrismaService } from '../prisma/prisma.service';

export interface InsertAuditLogInput {
  tenantId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  metadata: Record<string, unknown>;
}

// Sempre `unscoped`: o processor da fila roda fora do AsyncLocalStorage da
// requisição original (BullMQ processa o job depois, num contexto novo), e
// o tenantId já vem explícito no payload do job — não há o que auto-injetar.
@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async insert(input: InsertAuditLogInput) {
    return this.prisma.unscoped.auditLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        metadata: input.metadata as Prisma.InputJsonValue,
      },
    });
  }
}
