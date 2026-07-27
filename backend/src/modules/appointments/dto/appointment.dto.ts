import { IsBoolean, IsIn, IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { APPOINTMENT_STATUSES } from '@oficina/contracts';
import type {
  AppointmentListRequest,
  CreateAppointmentRequest,
  StartAppointmentRequest,
  TransitionAppointmentRequest,
  UpdateAppointmentRequest,
} from '@oficina/contracts';

export class CreateAppointmentDto implements CreateAppointmentRequest {
  @IsUUID('4') customerId!: string;
  @IsUUID('4') vehicleId!: string;
  @IsOptional() @IsUUID('4') technicianId?: string;
  @IsISO8601() startsAt!: string;
  @IsISO8601() endsAt!: string;
  @IsString() @IsNotEmpty() serviceDescription!: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() confirmConflict?: boolean;
}

export class UpdateAppointmentDto extends CreateAppointmentDto implements UpdateAppointmentRequest {
  @IsUUID('4') id!: string;
}

export class AppointmentListDto implements AppointmentListRequest {
  @IsISO8601() startsAt!: string;
  @IsISO8601() endsAt!: string;
  @IsOptional() @IsUUID('4') technicianId?: string;
  @IsOptional() @IsIn(APPOINTMENT_STATUSES) status?: AppointmentListRequest['status'];
}

export class TransitionAppointmentDto implements TransitionAppointmentRequest {
  @IsUUID('4') id!: string;
  @IsIn(APPOINTMENT_STATUSES) toStatus!: TransitionAppointmentRequest['toStatus'];
}

export class StartAppointmentDto implements StartAppointmentRequest {
  @IsUUID('4') id!: string;
}
