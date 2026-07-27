import { HttpStatus, Injectable } from '@nestjs/common';
import type { MaintenanceAlertListItemResponse, MaintenanceAlertListRequest, MaintenanceAlertResponse, PaginationData } from '@oficina/contracts';
import type { Customer as CustomerEntity, MaintenanceAlert as MaintenanceAlertEntity, Vehicle as VehicleEntity } from '@oficina/database';
import { AppErrorCode } from '../../../shared/errors/app-error-code';
import { AppException } from '../../../shared/errors/app-exception';
import type { AuthenticatedUser } from '../../../shared/guards/jwt-auth.guard';
import { VehicleRepository } from '../../vehicles/repositories/vehicle.repository';
import { CustomerRepository } from '../../customers/repositories/customer.repository';
import { MaintenanceAlertRepository } from '../repositories/maintenance-alert.repository';
import { monthsSince } from '../utils/months-since';

const DEFAULT_LIST_STATUS = 'OPEN';

@Injectable()
export class MaintenanceAlertManager {
  constructor(
    private readonly maintenanceAlertRepository: MaintenanceAlertRepository,
    private readonly vehicleRepository: VehicleRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  async list(request: MaintenanceAlertListRequest): Promise<PaginationData<MaintenanceAlertListItemResponse>> {
    const status = request.status ?? DEFAULT_LIST_STATUS;
    const { items, total } = await this.maintenanceAlertRepository.listByTenant(request.offset, request.limit, status);

    const vehicleIds = [...new Set(items.map((item) => item.vehicleId))];
    const customerIds = [...new Set(items.map((item) => item.customerId))];
    const [vehicles, customers] = await Promise.all([this.vehicleRepository.byIds(vehicleIds), this.customerRepository.byIds(customerIds)]);
    const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
    const customerById = new Map(customers.map((customer) => [customer.id, customer]));

    const now = new Date();

    return {
      items: items.map((alert) => this.toResponse(alert, vehicleById.get(alert.vehicleId) ?? null, customerById.get(alert.customerId) ?? null, now)),
      total,
      offset: request.offset,
      limit: request.limit,
      hasMore: request.offset + items.length < total,
    };
  }

  async resolve(actingUser: AuthenticatedUser, id: string): Promise<{ alert: MaintenanceAlertResponse }> {
    const existing = await this.maintenanceAlertRepository.byId(id);
    if (!existing) {
      throw new AppException(AppErrorCode.MAINTENANCE_ALERT_NOT_FOUND, 'Alerta de manutenção não encontrado.', HttpStatus.NOT_FOUND);
    }

    // Idempotente (Edge Case 8 da spec): resolver um alerta já RESOLVED
    // retorna o estado atual sem re-escrever `resolvedAt`/`resolvedBy`.
    let updated = existing;
    if (existing.status === 'OPEN') {
      await this.maintenanceAlertRepository.resolve(id, actingUser.userId, new Date());
      updated = (await this.maintenanceAlertRepository.byId(id)) ?? existing;
    }

    const [vehicle, customer] = await Promise.all([this.vehicleRepository.byId(updated.vehicleId), this.customerRepository.byId(updated.customerId)]);

    return { alert: this.toResponse(updated, vehicle, customer, new Date()) };
  }

  private toResponse(
    alert: MaintenanceAlertEntity,
    vehicle: VehicleEntity | null,
    customer: CustomerEntity | null,
    now: Date,
  ): MaintenanceAlertResponse {
    return {
      id: alert.id,
      tenantId: alert.tenantId,
      vehicleId: alert.vehicleId,
      vehicleBrand: vehicle?.brand ?? '—',
      vehicleModel: vehicle?.model ?? '—',
      vehiclePlate: vehicle?.plate ?? 'Veículo removido',
      customerId: alert.customerId,
      customerName: customer?.name ?? 'Cliente removido',
      referenceDate: alert.referenceDate.toISOString(),
      monthsOverdue: monthsSince(alert.referenceDate, now),
      status: alert.status as MaintenanceAlertResponse['status'],
      resolvedAt: alert.resolvedAt?.toISOString(),
      resolvedBy: alert.resolvedBy ?? undefined,
    };
  }
}
