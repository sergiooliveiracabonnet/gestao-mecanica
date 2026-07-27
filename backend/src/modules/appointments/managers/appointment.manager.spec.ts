import { AppointmentManager } from './appointment.manager';

const user = { userId: '00000000-0000-4000-8000-000000000001', tenantId: '00000000-0000-4000-8000-000000000002', role: 'FRONT_DESK' } as const;
const request = {
  customerId: '00000000-0000-4000-8000-000000000003',
  vehicleId: '00000000-0000-4000-8000-000000000004',
  technicianId: '00000000-0000-4000-8000-000000000005',
  startsAt: '2026-07-28T12:00:00.000Z',
  endsAt: '2026-07-28T13:00:00.000Z',
  serviceDescription: 'Revisão',
};

function setup(conflicts: unknown[] = []) {
  const appointments = {
    conflicts: jest.fn().mockResolvedValue(conflicts),
    insert: jest.fn().mockResolvedValue({
      id: 'a1', tenantId: user.tenantId, customerId: request.customerId, vehicleId: request.vehicleId,
      technicianId: request.technicianId, serviceOrderId: null, startsAt: new Date(request.startsAt),
      endsAt: new Date(request.endsAt), serviceDescription: 'Revisão', notes: null, status: 'SCHEDULED',
      createdBy: user.userId, cancelledAt: null, createdAt: new Date(), updatedAt: null, deletedAt: null,
    }),
  };
  const customers = { byId: jest.fn().mockResolvedValue({ id: request.customerId, name: 'Maria' }) };
  const vehicles = { byId: jest.fn().mockResolvedValue({ id: request.vehicleId, customerId: request.customerId, brand: 'Fiat', model: 'Uno', plate: 'ABC1D23' }) };
  const users = { byId: jest.fn().mockResolvedValue({ id: request.technicianId, name: 'Carlos', status: 'active' }) };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const manager = new AppointmentManager(appointments as never, customers as never, vehicles as never, users as never, {} as never, audit as never);
  return { manager, appointments };
}

describe('AppointmentManager', () => {
  it('rejeita intervalo invertido', async () => {
    const { manager } = setup();
    await expect(manager.create(user as never, { ...request, endsAt: request.startsAt })).rejects.toMatchObject({ code: 'APPOINTMENT_INVALID_INTERVAL' });
  });

  it('exige confirmação quando o técnico tem conflito', async () => {
    const { manager, appointments } = setup([{ id: 'conflict' }]);
    await expect(manager.create(user as never, request)).rejects.toMatchObject({ code: 'APPOINTMENT_CONFLICT' });
    expect(appointments.insert).not.toHaveBeenCalled();
  });

  it('permite salvar conflito confirmado', async () => {
    const { manager, appointments } = setup([{ id: 'conflict' }]);
    await manager.create(user as never, { ...request, confirmConflict: true });
    expect(appointments.insert).toHaveBeenCalled();
  });
});
