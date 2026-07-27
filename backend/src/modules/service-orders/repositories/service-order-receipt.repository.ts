import { Injectable } from '@nestjs/common';
import type { PaymentMethod } from '@oficina/contracts';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class ServiceOrderReceiptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async byServiceOrderId(serviceOrderId: string) {
    return this.prisma.client.serviceOrderReceipt.findMany({
      where: { serviceOrderId, deletedAt: null },
      orderBy: { receivedAt: 'desc' },
    });
  }

  async byServiceOrderIds(serviceOrderIds: string[]) {
    if (!serviceOrderIds.length) return [];
    return this.prisma.client.serviceOrderReceipt.findMany({
      where: { serviceOrderId: { in: serviceOrderIds }, deletedAt: null },
      orderBy: { receivedAt: 'desc' },
    });
  }

  async receivedSince(since: Date) {
    return this.prisma.client.serviceOrderReceipt.findMany({
      where: { receivedAt: { gte: since }, deletedAt: null },
      orderBy: { receivedAt: 'asc' },
    });
  }

  async insert(input: { tenantId: string; serviceOrderId: string; method: PaymentMethod; amountCents: number; receivedAt: Date; confirmedBy: string; notes?: string }) {
    return this.prisma.client.serviceOrderReceipt.create({ data: input });
  }

  async byId(id: string) {
    return this.prisma.client.serviceOrderReceipt.findFirst({ where: { id, deletedAt: null } });
  }

  async softDelete(id: string) {
    return this.prisma.client.serviceOrderReceipt.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: new Date() } });
  }
}
