import { HttpStatus, Injectable } from '@nestjs/common';
import type {
  AppointmentListRequest,
  AppointmentResponse,
  AppointmentStatus,
  CreateAppointmentRequest,
  StartAppointmentRequest,
  TransitionAppointmentRequest,
  UpdateAppointmentRequest,
} from '@oficina/contracts';
import type { Appointment, Customer, User, Vehicle } from '@oficina/database';
import { AppErrorCode } from '../../../shared/errors/app-error-code';
import { AppException } from '../../../shared/errors/app-exception';
import type { AuthenticatedUser } from '../../../shared/guards/jwt-auth.guard';
import { AuditLogService } from '../../../shared/audit-log/audit-log.service';
import { CustomerRepository } from '../../customers/repositories/customer.repository';
import { UserRepository } from '../../iam/repositories/user.repository';
import { VehicleRepository } from '../../vehicles/repositories/vehicle.repository';
import { ServiceOrderManager } from '../../service-orders/managers/service-order.manager';
import { AppointmentRepository, type AppointmentWriteInput } from '../repositories/appointment.repository';
import { canTransitionAppointment } from './appointment-state-machine';

@Injectable()
export class AppointmentManager {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly customers: CustomerRepository,
    private readonly vehicles: VehicleRepository,
    private readonly users: UserRepository,
    private readonly serviceOrders: ServiceOrderManager,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(actingUser: AuthenticatedUser, request: CreateAppointmentRequest): Promise<{ appointment: AppointmentResponse }> {
    const input = await this.validateWrite(actingUser, request);
    await this.ensureNoUnconfirmedConflict(request, input.startsAt, input.endsAt);
    const created = await this.appointments.insert(input);
    await this.record(actingUser, created.id, 'appointment.created');
    return { appointment: await this.toResponse(created) };
  }

  async update(actingUser: AuthenticatedUser, request: UpdateAppointmentRequest): Promise<{ appointment: AppointmentResponse }> {
    const existing = await this.getEntity(request.id);
    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(existing.status)) {
      throw new AppException(AppErrorCode.APPOINTMENT_INVALID_STATUS_TRANSITION, 'Este agendamento não pode mais ser editado.');
    }
    const input = await this.validateWrite(actingUser, request);
    await this.ensureNoUnconfirmedConflict(request, input.startsAt, input.endsAt, request.id);
    await this.appointments.update(request.id, input);
    await this.record(actingUser, request.id, 'appointment.updated');
    return { appointment: await this.toResponse(await this.getEntity(request.id)) };
  }

  async list(request: AppointmentListRequest): Promise<{ items: AppointmentResponse[] }> {
    const startsAt = new Date(request.startsAt);
    const endsAt = new Date(request.endsAt);
    this.validateInterval(startsAt, endsAt);
    const items = await this.appointments.listByPeriod(startsAt, endsAt, request.technicianId, request.status);
    return { items: await Promise.all(items.map((item) => this.toResponse(item))) };
  }

  async transition(actingUser: AuthenticatedUser, request: TransitionAppointmentRequest): Promise<{ appointment: AppointmentResponse }> {
    const existing = await this.getEntity(request.id);
    const fromStatus = existing.status as AppointmentStatus;
    if (!canTransitionAppointment(fromStatus, request.toStatus)) {
      throw new AppException(
        AppErrorCode.APPOINTMENT_INVALID_STATUS_TRANSITION,
        `Não é possível mudar o agendamento de ${fromStatus} para ${request.toStatus}.`,
      );
    }
    const result = await this.appointments.transition(request.id, fromStatus, request.toStatus);
    if (result.count === 0) {
      throw new AppException(AppErrorCode.APPOINTMENT_INVALID_STATUS_TRANSITION, 'O agendamento foi alterado. Recarregue e tente novamente.', HttpStatus.CONFLICT);
    }
    await this.record(actingUser, request.id, 'appointment.transitioned', { fromStatus, toStatus: request.toStatus });
    return { appointment: await this.toResponse(await this.getEntity(request.id)) };
  }

  async start(actingUser: AuthenticatedUser, request: StartAppointmentRequest) {
    const existing = await this.getEntity(request.id);
    if (existing.serviceOrderId || !['SCHEDULED', 'CONFIRMED'].includes(existing.status)) {
      throw new AppException(AppErrorCode.APPOINTMENT_ALREADY_STARTED, 'Este agendamento já foi iniciado ou não pode gerar uma OS.', HttpStatus.CONFLICT);
    }
    const result = await this.serviceOrders.create(actingUser, {
      vehicleId: existing.vehicleId,
      technicianId: existing.technicianId ?? undefined,
      diagnosis: existing.serviceDescription,
    });
    const linked = await this.appointments.linkServiceOrder(existing.id, result.serviceOrder.id);
    if (linked.count === 0) {
      throw new AppException(AppErrorCode.APPOINTMENT_ALREADY_STARTED, 'Este agendamento já foi iniciado.', HttpStatus.CONFLICT);
    }
    await this.record(actingUser, existing.id, 'appointment.started', { serviceOrderId: result.serviceOrder.id });
    return { appointment: await this.toResponse(await this.getEntity(existing.id)), serviceOrder: result.serviceOrder };
  }

  private async validateWrite(actingUser: AuthenticatedUser, request: CreateAppointmentRequest): Promise<AppointmentWriteInput> {
    const startsAt = new Date(request.startsAt);
    const endsAt = new Date(request.endsAt);
    this.validateInterval(startsAt, endsAt);
    const [customer, vehicle, technician] = await Promise.all([
      this.customers.byId(request.customerId),
      this.vehicles.byId(request.vehicleId),
      request.technicianId ? this.users.byId(request.technicianId) : Promise.resolve(null),
    ]);
    if (!customer || !vehicle || vehicle.customerId !== customer.id) {
      throw new AppException(AppErrorCode.APPOINTMENT_INVALID_RELATION, 'Cliente e veículo informados não correspondem.', HttpStatus.BAD_REQUEST);
    }
    if (request.technicianId && (!technician || technician.status !== 'active')) {
      throw new AppException(AppErrorCode.APPOINTMENT_INVALID_RELATION, 'Técnico informado não encontrado ou desabilitado.', HttpStatus.BAD_REQUEST);
    }
    return {
      tenantId: actingUser.tenantId,
      customerId: customer.id,
      vehicleId: vehicle.id,
      technicianId: request.technicianId ?? null,
      startsAt,
      endsAt,
      serviceDescription: request.serviceDescription.trim(),
      notes: request.notes?.trim() || null,
      createdBy: actingUser.userId,
    };
  }

  private validateInterval(startsAt: Date, endsAt: Date) {
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      throw new AppException(AppErrorCode.APPOINTMENT_INVALID_INTERVAL, 'O horário final deve ser posterior ao horário inicial.');
    }
  }

  private async ensureNoUnconfirmedConflict(
    request: CreateAppointmentRequest,
    startsAt: Date,
    endsAt: Date,
    excludeId?: string,
  ) {
    if (!request.technicianId || request.confirmConflict) return;
    const conflicts = await this.appointments.conflicts(startsAt, endsAt, request.technicianId, excludeId);
    if (conflicts.length > 0) {
      throw new AppException(
        AppErrorCode.APPOINTMENT_CONFLICT,
        `O técnico já possui ${conflicts.length} agendamento(s) nesse horário. Confirme para salvar mesmo assim.`,
        HttpStatus.CONFLICT,
      );
    }
  }

  private getEntity(id: string) {
    return this.appointments.byId(id).then((appointment) => {
      if (!appointment) throw new AppException(AppErrorCode.APPOINTMENT_NOT_FOUND, 'Agendamento não encontrado.', HttpStatus.NOT_FOUND);
      return appointment;
    });
  }

  private async toResponse(appointment: Appointment): Promise<AppointmentResponse> {
    const [customer, vehicle, technician] = await Promise.all([
      this.customers.byId(appointment.customerId),
      this.vehicles.byId(appointment.vehicleId),
      appointment.technicianId ? this.users.byId(appointment.technicianId) : Promise.resolve(null),
    ]);
    return this.mapResponse(appointment, customer, vehicle, technician);
  }

  private mapResponse(appointment: Appointment, customer: Customer | null, vehicle: Vehicle | null, technician: User | null): AppointmentResponse {
    return {
      id: appointment.id,
      tenantId: appointment.tenantId,
      customerId: appointment.customerId,
      customerName: customer?.name ?? 'Cliente removido',
      vehicleId: appointment.vehicleId,
      vehicleBrand: vehicle?.brand ?? '—',
      vehicleModel: vehicle?.model ?? '—',
      vehiclePlate: vehicle?.plate ?? 'Veículo removido',
      technicianId: appointment.technicianId ?? undefined,
      technicianName: technician?.name,
      serviceOrderId: appointment.serviceOrderId ?? undefined,
      startsAt: appointment.startsAt.toISOString(),
      endsAt: appointment.endsAt.toISOString(),
      serviceDescription: appointment.serviceDescription,
      notes: appointment.notes ?? undefined,
      status: appointment.status as AppointmentStatus,
      createdBy: appointment.createdBy,
      createdAt: appointment.createdAt.toISOString(),
      cancelledAt: appointment.cancelledAt?.toISOString(),
    };
  }

  private record(actingUser: AuthenticatedUser, id: string, action: string, metadata: Record<string, unknown> = {}) {
    return this.auditLog.record({ tenantId: actingUser.tenantId, userId: actingUser.userId, action, entity: 'appointment', entityId: id, metadata });
  }
}
