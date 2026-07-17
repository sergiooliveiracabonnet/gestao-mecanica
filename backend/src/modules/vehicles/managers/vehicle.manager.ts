import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@oficina/database';
import type {
  CreateVehicleRequest,
  PaginationData,
  UpdateVehicleRequest,
  VehicleListItemResponse,
  VehicleListRequest,
  VehicleResponse,
} from '@oficina/contracts';
import type { Customer as CustomerEntity, Vehicle as VehicleEntity } from '@oficina/database';
import { AppErrorCode } from '../../../shared/errors/app-error-code';
import { AppException } from '../../../shared/errors/app-exception';
import { AuditLogService } from '../../../shared/audit-log/audit-log.service';
import type { AuthenticatedUser } from '../../../shared/guards/jwt-auth.guard';
import { CustomerRepository } from '../../customers/repositories/customer.repository';
import { VehicleRepository } from '../repositories/vehicle.repository';

@Injectable()
export class VehicleManager {
  constructor(
    private readonly vehicleRepository: VehicleRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(actingUser: AuthenticatedUser, request: CreateVehicleRequest): Promise<{ vehicle: VehicleResponse }> {
    const customer = await this.customerRepository.byId(request.customerId);
    if (!customer) {
      throw new AppException(AppErrorCode.VEHICLE_CUSTOMER_NOT_FOUND, 'Cliente informado não encontrado.', HttpStatus.BAD_REQUEST);
    }

    const existingPlate = await this.vehicleRepository.byPlate(request.plate);
    if (existingPlate) {
      throw new AppException(AppErrorCode.VEHICLE_PLATE_ALREADY_EXISTS, 'Já existe um veículo cadastrado com esta placa.', HttpStatus.CONFLICT);
    }

    // Mesma rede de segurança contra corrida do CustomerManager.create —
    // ver comentário lá.
    let vehicle: VehicleEntity;
    try {
      vehicle = await this.vehicleRepository.insert({
        tenantId: actingUser.tenantId,
        customerId: request.customerId,
        brand: request.brand,
        model: request.model,
        plate: request.plate,
        year: request.year,
        engine: request.engine,
        fuelType: request.fuelType,
        chassis: request.chassis,
        mileage: request.mileage,
        photos: request.photos,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppException(AppErrorCode.VEHICLE_PLATE_ALREADY_EXISTS, 'Já existe um veículo cadastrado com esta placa.', HttpStatus.CONFLICT);
      }
      throw error;
    }

    await this.auditLog.record({
      tenantId: actingUser.tenantId,
      userId: actingUser.userId,
      action: 'vehicle.created',
      entity: 'vehicle',
      entityId: vehicle.id,
      metadata: { plate: vehicle.plate, customerId: vehicle.customerId },
    });

    return { vehicle: this.toResponse(vehicle, customer) };
  }

  async update(actingUser: AuthenticatedUser, request: UpdateVehicleRequest): Promise<{ vehicle: VehicleResponse }> {
    const existing = await this.vehicleRepository.byId(request.id);
    if (!existing) {
      throw new AppException(AppErrorCode.VEHICLE_NOT_FOUND, 'Veículo não encontrado.', HttpStatus.NOT_FOUND);
    }

    if (request.plate && request.plate !== existing.plate) {
      const conflictingPlate = await this.vehicleRepository.byPlate(request.plate);
      if (conflictingPlate) {
        throw new AppException(AppErrorCode.VEHICLE_PLATE_ALREADY_EXISTS, 'Já existe um veículo cadastrado com esta placa.', HttpStatus.CONFLICT);
      }
    }

    try {
      await this.vehicleRepository.update(request.id, {
        brand: request.brand,
        model: request.model,
        year: request.year,
        engine: request.engine,
        fuelType: request.fuelType,
        plate: request.plate,
        chassis: request.chassis,
        mileage: request.mileage,
        photos: request.photos,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppException(AppErrorCode.VEHICLE_PLATE_ALREADY_EXISTS, 'Já existe um veículo cadastrado com esta placa.', HttpStatus.CONFLICT);
      }
      throw error;
    }

    const updated = await this.vehicleRepository.byId(request.id);
    if (!updated) {
      throw new AppException(AppErrorCode.VEHICLE_NOT_FOUND, 'Veículo não encontrado.', HttpStatus.NOT_FOUND);
    }

    const customer = await this.customerRepository.byId(updated.customerId);
    if (!customer) {
      throw new AppException(
        AppErrorCode.VEHICLE_CUSTOMER_NOT_FOUND,
        `Veículo ${updated.id} referencia um cliente inexistente.`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    await this.auditLog.record({
      tenantId: actingUser.tenantId,
      userId: actingUser.userId,
      action: 'vehicle.updated',
      entity: 'vehicle',
      entityId: updated.id,
      metadata: {},
    });

    return { vehicle: this.toResponse(updated, customer) };
  }

  async delete(actingUser: AuthenticatedUser, id: string): Promise<{ vehicle: VehicleResponse }> {
    const existing = await this.vehicleRepository.byId(id);
    if (!existing) {
      throw new AppException(AppErrorCode.VEHICLE_NOT_FOUND, 'Veículo não encontrado.', HttpStatus.NOT_FOUND);
    }

    const { count } = await this.vehicleRepository.softDelete(id);
    if (count === 0) {
      throw new AppException(AppErrorCode.VEHICLE_NOT_FOUND, 'Veículo não encontrado.', HttpStatus.NOT_FOUND);
    }

    const customer = await this.customerRepository.byId(existing.customerId);

    await this.auditLog.record({
      tenantId: actingUser.tenantId,
      userId: actingUser.userId,
      action: 'vehicle.deleted',
      entity: 'vehicle',
      entityId: id,
      metadata: {},
    });

    return { vehicle: this.toResponse(existing, customer) };
  }

  async getById(id: string): Promise<{ vehicle: VehicleResponse }> {
    const vehicle = await this.vehicleRepository.byId(id);
    if (!vehicle) {
      throw new AppException(AppErrorCode.VEHICLE_NOT_FOUND, 'Veículo não encontrado.', HttpStatus.NOT_FOUND);
    }

    const customer = await this.customerRepository.byId(vehicle.customerId);
    return { vehicle: this.toResponse(vehicle, customer) };
  }

  async list(request: VehicleListRequest): Promise<PaginationData<VehicleListItemResponse>> {
    const { items, total } = await this.vehicleRepository.listByTenant(request.offset, request.limit, request.search, request.customerId);

    const customerIds = [...new Set(items.map((item) => item.customerId))];
    const customers = await this.customerRepository.byIds(customerIds);
    const customerById = new Map(customers.map((customer) => [customer.id, customer]));

    return {
      items: items.map((vehicle) => this.toResponse(vehicle, customerById.get(vehicle.customerId) ?? null)),
      total,
      offset: request.offset,
      limit: request.limit,
      hasMore: request.offset + items.length < total,
    };
  }

  private toResponse(vehicle: VehicleEntity, customer: CustomerEntity | null): VehicleResponse {
    return {
      id: vehicle.id,
      tenantId: vehicle.tenantId,
      customerId: vehicle.customerId,
      customerName: customer?.name ?? 'Cliente removido',
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year ?? undefined,
      engine: vehicle.engine ?? undefined,
      fuelType: vehicle.fuelType ?? undefined,
      plate: vehicle.plate,
      chassis: vehicle.chassis ?? undefined,
      mileage: vehicle.mileage ?? undefined,
      photos: vehicle.photos,
      createdAt: vehicle.createdAt.toISOString(),
    };
  }
}
