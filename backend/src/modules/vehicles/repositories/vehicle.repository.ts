import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface CreateVehicleInput {
  // O Prisma Middleware sobrescreve isto com o tenant do contexto ativo em
  // runtime (ver CREATE_OPERATIONS em tenant-isolation.middleware.ts) — só
  // existe aqui para satisfazer o tipo `VehicleCreateInput` do Prisma.
  tenantId: string;
  customerId: string;
  brand: string;
  model: string;
  plate: string;
  year?: number;
  engine?: string;
  fuelType?: string;
  chassis?: string;
  mileage?: number;
  photos?: string[];
}

export interface UpdateVehicleInput {
  brand?: string;
  model?: string;
  year?: number;
  engine?: string;
  fuelType?: string;
  plate?: string;
  chassis?: string;
  mileage?: number;
  photos?: string[];
}

@Injectable()
export class VehicleRepository {
  constructor(private readonly prisma: PrismaService) {}

  // `this.prisma.client` (tenant-scoped): toda operação de Vehicle roda
  // dentro de uma requisição autenticada — o Prisma Middleware injeta
  // tenant_id automaticamente (ver TENANT_SCOPED_MODELS).
  async insert(input: CreateVehicleInput) {
    return this.prisma.client.vehicle.create({
      data: {
        tenantId: input.tenantId,
        customerId: input.customerId,
        brand: input.brand,
        model: input.model,
        plate: input.plate,
        year: input.year,
        engine: input.engine,
        fuelType: input.fuelType,
        chassis: input.chassis,
        mileage: input.mileage,
        photos: input.photos ?? [],
      },
    });
  }

  async byId(id: string) {
    return this.prisma.client.vehicle.findFirst({
      where: { id, deletedAt: null },
    });
  }

  // Escopado ao tenant automaticamente pela extensão — checagem de
  // unicidade da placa é sempre POR TENANT (ver schema.prisma).
  async byPlate(plate: string) {
    return this.prisma.client.vehicle.findFirst({
      where: { plate, deletedAt: null },
    });
  }

  async update(id: string, patch: UpdateVehicleInput) {
    return this.prisma.client.vehicle.updateMany({
      where: { id, deletedAt: null },
      data: patch,
    });
  }

  async softDelete(id: string) {
    return this.prisma.client.vehicle.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  async listByTenant(offset: number, limit: number, search?: string, customerId?: string) {
    const where = {
      deletedAt: null,
      ...(customerId ? { customerId } : {}),
      ...(search
        ? {
            OR: [
              { brand: { contains: search, mode: 'insensitive' as const } },
              { model: { contains: search, mode: 'insensitive' as const } },
              { plate: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.client.vehicle.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.client.vehicle.count({ where }),
    ]);

    return { items, total };
  }
}
