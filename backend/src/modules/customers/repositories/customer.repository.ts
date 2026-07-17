import { Injectable } from '@nestjs/common';
import type { CustomerAddress } from '@oficina/contracts';
import type { Prisma } from '@oficina/database';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface CreateCustomerInput {
  // O Prisma Middleware sobrescreve isto com o tenant do contexto ativo em
  // runtime (ver CREATE_OPERATIONS em tenant-isolation.middleware.ts) — só
  // existe aqui para satisfazer o tipo `CustomerCreateInput` do Prisma.
  tenantId: string;
  type: string;
  document: string;
  name: string;
  phone: string;
  email?: string;
  address?: CustomerAddress;
  notes?: string;
}

export interface UpdateCustomerInput {
  name?: string;
  phone?: string;
  email?: string;
  address?: CustomerAddress;
  notes?: string;
}

export interface ListCustomersResult<T> {
  items: T[];
  total: number;
}

@Injectable()
export class CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  // `this.prisma.client` (tenant-scoped): toda operação de Customer roda
  // dentro de uma requisição autenticada — o Prisma Middleware injeta
  // tenant_id automaticamente (ver TENANT_SCOPED_MODELS em
  // tenant-isolation.middleware.ts).
  async insert(input: CreateCustomerInput) {
    return this.prisma.client.customer.create({
      data: {
        tenantId: input.tenantId,
        type: input.type,
        document: input.document,
        name: input.name,
        phone: input.phone,
        email: input.email,
        address: input.address as Prisma.InputJsonValue | undefined,
        notes: input.notes,
      },
    });
  }

  async byId(id: string) {
    return this.prisma.client.customer.findFirst({
      where: { id, deletedAt: null },
    });
  }

  // Usado pelo VehicleManager pra denormalizar o nome do dono em telas de
  // listagem de veículos sem N+1 (uma query em lote em vez de uma por
  // veículo).
  async byIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }
    return this.prisma.client.customer.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });
  }

  // Escopado ao tenant automaticamente pela extensão — checagem de
  // unicidade do documento é sempre POR TENANT (ver schema.prisma).
  async byDocument(document: string) {
    return this.prisma.client.customer.findFirst({
      where: { document, deletedAt: null },
    });
  }

  async update(id: string, patch: UpdateCustomerInput) {
    return this.prisma.client.customer.updateMany({
      where: { id, deletedAt: null },
      data: { ...patch, address: patch.address as Prisma.InputJsonValue | undefined },
    });
  }

  async softDelete(id: string) {
    return this.prisma.client.customer.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  async listByTenant(offset: number, limit: number, search?: string) {
    const where = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { document: { contains: search } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.client.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.client.customer.count({ where }),
    ]);

    return { items, total };
  }
}
