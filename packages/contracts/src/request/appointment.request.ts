import type { AppointmentStatus } from '../response/appointment.response';

export interface CreateAppointmentRequest {
  customerId: string;
  vehicleId: string;
  technicianId?: string;
  startsAt: string;
  endsAt: string;
  serviceDescription: string;
  notes?: string;
  confirmConflict?: boolean;
}

export interface UpdateAppointmentRequest extends CreateAppointmentRequest {
  id: string;
}

export interface AppointmentListRequest {
  startsAt: string;
  endsAt: string;
  technicianId?: string;
  status?: AppointmentStatus;
}

export interface TransitionAppointmentRequest {
  id: string;
  toStatus: AppointmentStatus;
}

export interface StartAppointmentRequest {
  id: string;
}
