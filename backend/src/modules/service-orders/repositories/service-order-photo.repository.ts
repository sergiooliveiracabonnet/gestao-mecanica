import { Injectable } from '@nestjs/common';
import type { ServiceOrderPhotoCategory } from '@oficina/contracts';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class ServiceOrderPhotoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async insert(input: { tenantId: string; serviceOrderId: string; category: ServiceOrderPhotoCategory; caption?: string; storageKey: string; originalName: string; mimeType: string; sizeBytes: number }) {
    return this.prisma.client.serviceOrderPhoto.create({ data: input });
  }

  async list(serviceOrderId: string) {
    return this.prisma.client.serviceOrderPhoto.findMany({
      where: { serviceOrderId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async byId(id: string) {
    return this.prisma.client.serviceOrderPhoto.findFirst({ where: { id, deletedAt: null } });
  }

  async softDelete(id: string) {
    return this.prisma.client.serviceOrderPhoto.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: new Date() } });
  }
}
