import { HttpStatus, Injectable } from '@nestjs/common';
import type {
  CreateServiceOrderRequest,
  PaginationData,
  ServiceOrderListRequest,
  ServiceOrderResponse,
  ServiceOrderStatusHistoryItemResponse,
  TransitionServiceOrderRequest,
  UpdateServiceOrderRequest,
} from '@oficina/contracts';
import type {
  Customer as CustomerEntity,
  ServiceOrder as ServiceOrderEntity,
  ServiceOrderStatusHistory as ServiceOrderStatusHistoryEntity,
  User as UserEntity,
  Vehicle as VehicleEntity,
} from '@oficina/database';
import { AppErrorCode } from '../../../shared/errors/app-error-code';
import { AppException } from '../../../shared/errors/app-exception';
import { AuditLogService } from '../../../shared/audit-log/audit-log.service';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { AuthenticatedUser } from '../../../shared/guards/jwt-auth.guard';
import { CustomerRepository } from '../../customers/repositories/customer.repository';
import { VehicleRepository } from '../../vehicles/repositories/vehicle.repository';
import { UserRepository } from '../../iam/repositories/user.repository';
import { ServiceOrderRepository } from '../repositories/service-order.repository';
import { ServiceOrderStatusHistoryRepository } from '../repositories/service-order-status-history.repository';
import { SERVICE_ORDER_CLOSING_STATUSES, SERVICE_ORDER_TRANSITIONS } from './service-order-state-machine';

@Injectable()
export class ServiceOrderManager {
  constructor(
    private readonly serviceOrderRepository: ServiceOrderRepository,
    private readonly statusHistoryRepository: ServiceOrderStatusHistoryRepository,
    private readonly vehicleRepository: VehicleRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly userRepository: UserRepository,
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(actingUser: AuthenticatedUser, request: CreateServiceOrderRequest): Promise<{ serviceOrder: ServiceOrderResponse }> {
    const vehicle = await this.vehicleRepository.byId(request.vehicleId);
    if (!vehicle) {
      throw new AppException(AppErrorCode.SERVICE_ORDER_VEHICLE_NOT_FOUND, 'Veículo informado não encontrado.', HttpStatus.BAD_REQUEST);
    }

    let technician: UserEntity | null = null;
    if (request.technicianId) {
      technician = await this.userRepository.byId(request.technicianId);
      if (!technician || technician.status !== 'active') {
        throw new AppException(AppErrorCode.SERVICE_ORDER_TECHNICIAN_NOT_FOUND, 'Técnico informado não encontrado ou está desabilitado.', HttpStatus.BAD_REQUEST);
      }
    }

    const openedAt = new Date();
    const serviceOrder = await this.prisma.transaction(async (tx) => {
      const created = await this.serviceOrderRepository.insert(
        {
          tenantId: actingUser.tenantId,
          customerId: vehicle.customerId,
          vehicleId: vehicle.id,
          technicianId: request.technicianId,
          checklist: request.checklist,
          diagnosis: request.diagnosis,
          openedAt,
        },
        tx,
      );

      await this.statusHistoryRepository.insert(
        {
          serviceOrderId: created.id,
          fromStatus: null,
          toStatus: 'OPEN',
          changedBy: actingUser.userId,
          changedAt: openedAt,
        },
        tx,
      );

      return created;
    });

    const customer = await this.customerRepository.byId(vehicle.customerId);

    await this.auditLog.record({
      tenantId: actingUser.tenantId,
      userId: actingUser.userId,
      action: 'service_order.created',
      entity: 'service_order',
      entityId: serviceOrder.id,
      metadata: { vehicleId: vehicle.id, status: serviceOrder.status },
    });

    return { serviceOrder: this.toResponse(serviceOrder, vehicle, customer, technician) };
  }

  async update(actingUser: AuthenticatedUser, request: UpdateServiceOrderRequest): Promise<{ serviceOrder: ServiceOrderResponse }> {
    const existing = await this.serviceOrderRepository.byId(request.id);
    if (!existing) {
      throw new AppException(AppErrorCode.SERVICE_ORDER_NOT_FOUND, 'Ordem de serviço não encontrada.', HttpStatus.NOT_FOUND);
    }

    if (request.technicianId) {
      const technician = await this.userRepository.byId(request.technicianId);
      if (!technician || technician.status !== 'active') {
        throw new AppException(AppErrorCode.SERVICE_ORDER_TECHNICIAN_NOT_FOUND, 'Técnico informado não encontrado ou está desabilitado.', HttpStatus.BAD_REQUEST);
      }
    }

    await this.serviceOrderRepository.update(request.id, {
      technicianId: request.technicianId,
      checklist: request.checklist,
      diagnosis: request.diagnosis,
    });

    const updated = await this.serviceOrderRepository.byId(request.id);
    if (!updated) {
      throw new AppException(AppErrorCode.SERVICE_ORDER_NOT_FOUND, 'Ordem de serviço não encontrada.', HttpStatus.NOT_FOUND);
    }

    // Sem throw se veículo/cliente/técnico não existirem mais: a mutação já
    // foi persistida (linha acima) — mesmo fallback null-safe da Feature 4
    // (VehicleManager.update).
    const [vehicle, technician] = await Promise.all([
      this.vehicleRepository.byId(updated.vehicleId),
      updated.technicianId ? this.userRepository.byId(updated.technicianId) : Promise.resolve(null),
    ]);
    const customer = await this.customerRepository.byId(updated.customerId);

    await this.auditLog.record({
      tenantId: actingUser.tenantId,
      userId: actingUser.userId,
      action: 'service_order.updated',
      entity: 'service_order',
      entityId: updated.id,
      metadata: {},
    });

    return { serviceOrder: this.toResponse(updated, vehicle, customer, technician) };
  }

  async transition(actingUser: AuthenticatedUser, request: TransitionServiceOrderRequest): Promise<{ serviceOrder: ServiceOrderResponse }> {
    const existing = await this.serviceOrderRepository.byId(request.id);
    if (!existing) {
      throw new AppException(AppErrorCode.SERVICE_ORDER_NOT_FOUND, 'Ordem de serviço não encontrada.', HttpStatus.NOT_FOUND);
    }

    const fromStatus = existing.status as ServiceOrderEntity['status'] as keyof typeof SERVICE_ORDER_TRANSITIONS;
    const allowedTargets = SERVICE_ORDER_TRANSITIONS[fromStatus] ?? [];
    if (!allowedTargets.includes(request.toStatus)) {
      throw new AppException(
        AppErrorCode.SERVICE_ORDER_INVALID_STATUS_TRANSITION,
        `Não é possível mudar o status de ${fromStatus} para ${request.toStatus}.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const changedAt = new Date();
    const closedAt = SERVICE_ORDER_CLOSING_STATUSES.includes(request.toStatus) ? changedAt : undefined;

    await this.prisma.transaction(async (tx) => {
      const result = await this.serviceOrderRepository.transition(tx, request.id, fromStatus, request.toStatus, closedAt);
      if (result.count === 0) {
        // Perdeu a corrida: outra requisição mudou o status entre a
        // validação acima e esta escrita (ver Edge Case 5 da spec).
        throw new AppException(
          AppErrorCode.SERVICE_ORDER_INVALID_STATUS_TRANSITION,
          'O status da ordem de serviço mudou antes desta transição ser aplicada. Recarregue e tente novamente.',
          HttpStatus.CONFLICT,
        );
      }

      await this.statusHistoryRepository.insert(
        {
          serviceOrderId: request.id,
          fromStatus,
          toStatus: request.toStatus,
          changedBy: actingUser.userId,
          changedAt,
        },
        tx,
      );
    });

    const updated = await this.serviceOrderRepository.byId(request.id);
    if (!updated) {
      throw new AppException(AppErrorCode.SERVICE_ORDER_NOT_FOUND, 'Ordem de serviço não encontrada.', HttpStatus.NOT_FOUND);
    }

    const [vehicle, technician] = await Promise.all([
      this.vehicleRepository.byId(updated.vehicleId),
      updated.technicianId ? this.userRepository.byId(updated.technicianId) : Promise.resolve(null),
    ]);
    const customer = await this.customerRepository.byId(updated.customerId);

    await this.auditLog.record({
      tenantId: actingUser.tenantId,
      userId: actingUser.userId,
      action: 'service_order.transitioned',
      entity: 'service_order',
      entityId: updated.id,
      metadata: { fromStatus, toStatus: request.toStatus },
    });

    return { serviceOrder: this.toResponse(updated, vehicle, customer, technician) };
  }

  async delete(actingUser: AuthenticatedUser, id: string): Promise<{ serviceOrder: ServiceOrderResponse }> {
    const existing = await this.serviceOrderRepository.byId(id);
    if (!existing) {
      throw new AppException(AppErrorCode.SERVICE_ORDER_NOT_FOUND, 'Ordem de serviço não encontrada.', HttpStatus.NOT_FOUND);
    }

    const { count } = await this.serviceOrderRepository.softDelete(id);
    if (count === 0) {
      throw new AppException(AppErrorCode.SERVICE_ORDER_NOT_FOUND, 'Ordem de serviço não encontrada.', HttpStatus.NOT_FOUND);
    }

    const [vehicle, technician] = await Promise.all([
      this.vehicleRepository.byId(existing.vehicleId),
      existing.technicianId ? this.userRepository.byId(existing.technicianId) : Promise.resolve(null),
    ]);
    const customer = await this.customerRepository.byId(existing.customerId);

    await this.auditLog.record({
      tenantId: actingUser.tenantId,
      userId: actingUser.userId,
      action: 'service_order.deleted',
      entity: 'service_order',
      entityId: id,
      metadata: {},
    });

    return { serviceOrder: this.toResponse(existing, vehicle, customer, technician) };
  }

  async getById(id: string): Promise<{ serviceOrder: ServiceOrderResponse }> {
    const serviceOrder = await this.serviceOrderRepository.byId(id);
    if (!serviceOrder) {
      throw new AppException(AppErrorCode.SERVICE_ORDER_NOT_FOUND, 'Ordem de serviço não encontrada.', HttpStatus.NOT_FOUND);
    }

    const [vehicle, technician, history] = await Promise.all([
      this.vehicleRepository.byId(serviceOrder.vehicleId),
      serviceOrder.technicianId ? this.userRepository.byId(serviceOrder.technicianId) : Promise.resolve(null),
      this.statusHistoryRepository.byServiceOrderId(id),
    ]);
    const customer = await this.customerRepository.byId(serviceOrder.customerId);

    return { serviceOrder: this.toResponse(serviceOrder, vehicle, customer, technician, history) };
  }

  async list(request: ServiceOrderListRequest): Promise<PaginationData<ServiceOrderResponse>> {
    const { items, total } = await this.serviceOrderRepository.listByTenant(
      request.offset,
      request.limit,
      request.status,
      request.vehicleId,
      request.technicianId,
    );

    const vehicleIds = [...new Set(items.map((item) => item.vehicleId))];
    const customerIds = [...new Set(items.map((item) => item.customerId))];
    const technicianIds = [...new Set(items.map((item) => item.technicianId).filter((id): id is string => !!id))];

    const [vehicles, customers, technicians] = await Promise.all([
      this.vehicleRepository.byIds(vehicleIds),
      this.customerRepository.byIds(customerIds),
      this.userRepository.byIds(technicianIds),
    ]);
    const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
    const customerById = new Map(customers.map((customer) => [customer.id, customer]));
    const technicianById = new Map(technicians.map((technician) => [technician.id, technician]));

    return {
      items: items.map((serviceOrder) =>
        this.toResponse(
          serviceOrder,
          vehicleById.get(serviceOrder.vehicleId) ?? null,
          customerById.get(serviceOrder.customerId) ?? null,
          serviceOrder.technicianId ? (technicianById.get(serviceOrder.technicianId) ?? null) : null,
        ),
      ),
      total,
      offset: request.offset,
      limit: request.limit,
      hasMore: request.offset + items.length < total,
    };
  }

  private toResponse(
    serviceOrder: ServiceOrderEntity,
    vehicle: VehicleEntity | null,
    customer: CustomerEntity | null,
    technician: UserEntity | null,
    history?: ServiceOrderStatusHistoryEntity[],
  ): ServiceOrderResponse {
    return {
      id: serviceOrder.id,
      tenantId: serviceOrder.tenantId,
      customerId: serviceOrder.customerId,
      customerName: customer?.name ?? 'Cliente removido',
      vehicleId: serviceOrder.vehicleId,
      vehicleBrand: vehicle?.brand ?? '—',
      vehicleModel: vehicle?.model ?? '—',
      vehiclePlate: vehicle?.plate ?? 'Veículo removido',
      status: serviceOrder.status as ServiceOrderResponse['status'],
      checklist: (serviceOrder.checklist as Record<string, unknown> | null) ?? undefined,
      diagnosis: serviceOrder.diagnosis ?? undefined,
      technicianId: serviceOrder.technicianId ?? undefined,
      technicianName: technician?.name,
      openedAt: serviceOrder.openedAt.toISOString(),
      closedAt: serviceOrder.closedAt?.toISOString(),
      createdAt: serviceOrder.createdAt.toISOString(),
      statusHistory: history?.map((item) => this.toHistoryItem(item)),
    };
  }

  private toHistoryItem(item: ServiceOrderStatusHistoryEntity): ServiceOrderStatusHistoryItemResponse {
    return {
      id: item.id,
      fromStatus: (item.fromStatus as ServiceOrderStatusHistoryItemResponse['fromStatus']) ?? null,
      toStatus: item.toStatus as ServiceOrderStatusHistoryItemResponse['toStatus'],
      changedBy: item.changedBy,
      changedAt: item.changedAt.toISOString(),
    };
  }
}
