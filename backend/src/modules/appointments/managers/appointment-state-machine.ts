import type { AppointmentStatus } from '@oficina/contracts';

const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: ['CONFIRMED', 'CANCELLED', 'NO_SHOW', 'IN_SERVICE'],
  CONFIRMED: ['CANCELLED', 'NO_SHOW', 'IN_SERVICE'],
  IN_SERVICE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export function canTransitionAppointment(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return TRANSITIONS[from].includes(to);
}
