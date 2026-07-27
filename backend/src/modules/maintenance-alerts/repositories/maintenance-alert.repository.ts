import { Injectable } from '@nestjs/common';
import type { PrismaClient } from '@oficina/database';
import type { MaintenanceAlertStatus } from '@oficina/contracts';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface UpsertOpenMaintenanceAlertInput {
  tenantId: string;
  vehicleId: string;
  customerId: string;
  referenceDate: Date;
}

@Injectable()
export class MaintenanceAlertRepository {
  constructor(private readonly prisma: PrismaService) {}

  // `this.prisma.client` (tenant-scoped): usado por Controller/Manager
  // dentro de uma requisição autenticada.
  async listByTenant(offset: number, limit: number, status: MaintenanceAlertStatus) {
    const where = { status };

    const [items, total] = await Promise.all([
      this.prisma.client.maintenanceAlert.findMany({
        where,
        orderBy: { referenceDate: 'asc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.client.maintenanceAlert.count({ where }),
    ]);

    return { items, total };
  }

  async byId(id: string) {
    return this.prisma.client.maintenanceAlert.findFirst({ where: { id } });
  }

  // `updateMany` com `status: 'OPEN'` no WHERE (não só `id`) — idempotente:
  // resolver um alerta já RESOLVED não sobrescreve `resolvedAt`/`resolvedBy`
  // da primeira resolução (Edge Case 8 da spec).
  async resolve(id: string, resolvedBy: string, resolvedAt: Date) {
    return this.prisma.client.maintenanceAlert.updateMany({
      where: { id, status: 'OPEN' },
      data: { status: 'RESOLVED', resolvedAt, resolvedBy },
    });
  }

  // Chamado de dentro da transação de ServiceOrderManager.transition (tx já
  // escopado — ver PrismaService.transaction). Resolve automaticamente
  // qualquer alerta OPEN do veículo quando uma OS chega a DELIVERED (Edge
  // Case 4 da spec: a referência mudou, o alerta antigo fica obsoleto).
  async resolveOpenByVehicleId(tx: PrismaClient, vehicleId: string, resolvedAt: Date) {
    return tx.maintenanceAlert.updateMany({
      where: { vehicleId, status: 'OPEN' },
      data: { status: 'RESOLVED', resolvedAt },
    });
  }

  // Sempre `unscoped`, chamado só por MaintenanceAlertScanProcessor (roda
  // fora do AsyncLocalStorage de uma requisição — mesmo padrão de
  // AuditLogRepository). `upsert` no índice único (vehicleId, referenceDate)
  // é o mecanismo de idempotência: rodar o job duas vezes seguidas nunca
  // duplica alerta, e `update: {}` nunca sobrescreve um alerta já RESOLVED
  // manualmente pro mesmo ciclo.
  async upsertOpenAlert(input: UpsertOpenMaintenanceAlertInput) {
    return this.prisma.unscoped.maintenanceAlert.upsert({
      where: {
        vehicleId_referenceDate: {
          vehicleId: input.vehicleId,
          referenceDate: input.referenceDate,
        },
      },
      create: {
        tenantId: input.tenantId,
        vehicleId: input.vehicleId,
        customerId: input.customerId,
        referenceDate: input.referenceDate,
        status: 'OPEN',
      },
      update: {},
    });
  }
}
