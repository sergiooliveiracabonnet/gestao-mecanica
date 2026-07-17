import { Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@oficina/database';
import type { ServiceOrderStatus } from '@oficina/contracts';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface CreateServiceOrderInput {
  // O Prisma Middleware sobrescreve isto com o tenant do contexto ativo em
  // runtime (ver CREATE_OPERATIONS em tenant-isolation.middleware.ts) — só
  // existe aqui para satisfazer o tipo `ServiceOrderCreateInput` do Prisma.
  tenantId: string;
  customerId: string;
  vehicleId: string;
  technicianId?: string;
  checklist?: Record<string, unknown>;
  diagnosis?: string;
  openedAt: Date;
}

export interface UpdateServiceOrderInput {
  technicianId?: string;
  checklist?: Record<string, unknown>;
  diagnosis?: string;
}

@Injectable()
export class ServiceOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  // `this.prisma.client` (tenant-scoped): toda operação de ServiceOrder
  // roda dentro de uma requisição autenticada — o Prisma Middleware injeta
  // tenant_id automaticamente (ver TENANT_SCOPED_MODELS).
  async insert(input: CreateServiceOrderInput, tx?: PrismaClient) {
    const db = tx ?? this.prisma.client;
    return db.serviceOrder.create({
      data: {
        tenantId: input.tenantId,
        customerId: input.customerId,
        vehicleId: input.vehicleId,
        technicianId: input.technicianId,
        checklist: input.checklist as Prisma.InputJsonValue | undefined,
        diagnosis: input.diagnosis,
        status: 'OPEN',
        openedAt: input.openedAt,
      },
    });
  }

  async byId(id: string) {
    return this.prisma.client.serviceOrder.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async update(id: string, patch: UpdateServiceOrderInput) {
    return this.prisma.client.serviceOrder.updateMany({
      where: { id, deletedAt: null },
      data: { ...patch, checklist: patch.checklist as Prisma.InputJsonValue | undefined },
    });
  }

  // Transição atômica: o WHERE checa `status: fromStatus`, não só `id` —
  // se outra requisição já mudou o status entre a validação do Manager e
  // esta chamada, `count` vem 0 e o Manager sabe que perdeu a corrida (ver
  // Edge Case 5 da spec e o Gotcha no plano). Sempre chamado dentro de uma
  // `prisma.transaction`, na mesma tx que grava o histórico.
  async transition(tx: PrismaClient, id: string, fromStatus: ServiceOrderStatus, toStatus: ServiceOrderStatus, closedAt?: Date) {
    return tx.serviceOrder.updateMany({
      where: { id, status: fromStatus, deletedAt: null },
      data: { status: toStatus, closedAt },
    });
  }

  async softDelete(id: string) {
    return this.prisma.client.serviceOrder.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  async listByTenant(
    offset: number,
    limit: number,
    status?: ServiceOrderStatus,
    vehicleId?: string,
    technicianId?: string,
    customerId?: string,
  ) {
    const where = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(vehicleId ? { vehicleId } : {}),
      ...(technicianId ? { technicianId } : {}),
      ...(customerId ? { customerId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.client.serviceOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.client.serviceOrder.count({ where }),
    ]);

    return { items, total };
  }
}
