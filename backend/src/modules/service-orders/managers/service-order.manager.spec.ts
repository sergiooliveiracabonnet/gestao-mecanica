import { HttpStatus } from '@nestjs/common';
import { ServiceOrderManager } from './service-order.manager';

const actingUser = { userId: 'user-1', tenantId: 'tenant-1', role: 'ADMIN' as const };
const FAKE_TX = {} as never;

function buildManager() {
  const serviceOrderRepository = {
    insert: jest.fn(),
    byId: jest.fn(),
    update: jest.fn(),
    transition: jest.fn(),
    softDelete: jest.fn(),
    listByTenant: jest.fn(),
  };
  const statusHistoryRepository = {
    insert: jest.fn(),
    byServiceOrderId: jest.fn(),
  };
  const vehicleRepository = {
    byId: jest.fn(),
    byIds: jest.fn(),
  };
  const customerRepository = {
    byId: jest.fn(),
    byIds: jest.fn(),
  };
  const userRepository = {
    byId: jest.fn(),
    byIds: jest.fn(),
  };
  const prisma = {
    transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => fn(FAKE_TX)),
  };
  const auditLog = { record: jest.fn() };

  const manager = new ServiceOrderManager(
    serviceOrderRepository as never,
    statusHistoryRepository as never,
    vehicleRepository as never,
    customerRepository as never,
    userRepository as never,
    prisma as never,
    auditLog as never,
  );

  return { manager, serviceOrderRepository, statusHistoryRepository, vehicleRepository, customerRepository, userRepository, prisma, auditLog };
}

const baseCustomer = {
  id: 'customer-1',
  tenantId: 'tenant-1',
  type: 'PF',
  document: '11144477735',
  name: 'João da Silva',
  email: null,
  phone: '11999998888',
  address: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: null,
  deletedAt: null,
};

const baseVehicle = {
  id: 'vehicle-1',
  tenantId: 'tenant-1',
  customerId: 'customer-1',
  brand: 'Fiat',
  model: 'Uno',
  year: 2015,
  engine: null,
  fuelType: null,
  plate: 'ABC1D23',
  chassis: null,
  mileage: null,
  photos: [],
  createdAt: new Date(),
  updatedAt: null,
  deletedAt: null,
};

const baseTechnician = {
  id: 'technician-1',
  tenantId: 'tenant-1',
  email: 'tech@oficina.com',
  passwordHash: 'hash',
  name: 'Carlos Mecânico',
  roleId: 'role-mechanic',
  status: 'active',
  inviteTokenHash: null,
  inviteExpiresAt: null,
  mfaEnabled: false,
  mfaSecret: null,
  createdAt: new Date(),
  updatedAt: null,
  deletedAt: null,
};

const baseServiceOrder = {
  id: 'so-1',
  tenantId: 'tenant-1',
  customerId: 'customer-1',
  vehicleId: 'vehicle-1',
  status: 'OPEN',
  checklist: null,
  diagnosis: null,
  technicianId: null,
  openedAt: new Date('2026-07-17T10:00:00Z'),
  closedAt: null,
  createdAt: new Date('2026-07-17T10:00:00Z'),
  updatedAt: null,
  deletedAt: null,
};

describe('ServiceOrderManager', () => {
  describe('create', () => {
    it('creates a service order linked to a vehicle and derives customerId from it', async () => {
      const deps = buildManager();
      deps.vehicleRepository.byId.mockResolvedValue(baseVehicle);
      deps.serviceOrderRepository.insert.mockResolvedValue(baseServiceOrder);
      deps.customerRepository.byId.mockResolvedValue(baseCustomer);

      const result = await deps.manager.create(actingUser, { vehicleId: 'vehicle-1' });

      expect(result.serviceOrder.customerId).toBe('customer-1');
      expect(result.serviceOrder.status).toBe('OPEN');
      expect(deps.statusHistoryRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({ fromStatus: null, toStatus: 'OPEN' }),
        FAKE_TX,
      );
      expect(deps.auditLog.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'service_order.created' }));
    });

    it('rejects a non-existent vehicleId with 400', async () => {
      const deps = buildManager();
      deps.vehicleRepository.byId.mockResolvedValue(null);

      await expect(deps.manager.create(actingUser, { vehicleId: 'missing' })).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        code: 'SERVICE_ORDER_VEHICLE_NOT_FOUND',
      });
      expect(deps.serviceOrderRepository.insert).not.toHaveBeenCalled();
    });

    it('rejects a non-existent technicianId with 400', async () => {
      const deps = buildManager();
      deps.vehicleRepository.byId.mockResolvedValue(baseVehicle);
      deps.userRepository.byId.mockResolvedValue(null);

      await expect(deps.manager.create(actingUser, { vehicleId: 'vehicle-1', technicianId: 'missing' })).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        code: 'SERVICE_ORDER_TECHNICIAN_NOT_FOUND',
      });
    });

    it('succeeds without a technicianId (optional at creation)', async () => {
      const deps = buildManager();
      deps.vehicleRepository.byId.mockResolvedValue(baseVehicle);
      deps.serviceOrderRepository.insert.mockResolvedValue(baseServiceOrder);
      deps.customerRepository.byId.mockResolvedValue(baseCustomer);

      const result = await deps.manager.create(actingUser, { vehicleId: 'vehicle-1' });

      expect(result.serviceOrder.technicianId).toBeUndefined();
      expect(deps.userRepository.byId).not.toHaveBeenCalled();
    });

    it('rejects a disabled technicianId with 400', async () => {
      const deps = buildManager();
      deps.vehicleRepository.byId.mockResolvedValue(baseVehicle);
      deps.userRepository.byId.mockResolvedValue({ ...baseTechnician, status: 'disabled' });

      await expect(deps.manager.create(actingUser, { vehicleId: 'vehicle-1', technicianId: 'technician-1' })).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        code: 'SERVICE_ORDER_TECHNICIAN_NOT_FOUND',
      });
      expect(deps.serviceOrderRepository.insert).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates allowed fields without touching status', async () => {
      const deps = buildManager();
      const updated = { ...baseServiceOrder, diagnosis: 'Pastilha de freio gasta' };
      deps.serviceOrderRepository.byId.mockResolvedValueOnce(baseServiceOrder).mockResolvedValueOnce(updated);
      deps.vehicleRepository.byId.mockResolvedValue(baseVehicle);
      deps.customerRepository.byId.mockResolvedValue(baseCustomer);

      const result = await deps.manager.update(actingUser, { id: 'so-1', diagnosis: 'Pastilha de freio gasta' });

      expect(result.serviceOrder.diagnosis).toBe('Pastilha de freio gasta');
      expect(result.serviceOrder.status).toBe('OPEN');
    });

    it('rejects an update for a non-existent service order with 404', async () => {
      const deps = buildManager();
      deps.serviceOrderRepository.byId.mockResolvedValue(null);

      await expect(deps.manager.update(actingUser, { id: 'missing' })).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
    });

    it('rejects a disabled technicianId with 400', async () => {
      const deps = buildManager();
      deps.serviceOrderRepository.byId.mockResolvedValue(baseServiceOrder);
      deps.userRepository.byId.mockResolvedValue({ ...baseTechnician, status: 'disabled' });

      await expect(deps.manager.update(actingUser, { id: 'so-1', technicianId: 'technician-1' })).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        code: 'SERVICE_ORDER_TECHNICIAN_NOT_FOUND',
      });
      expect(deps.serviceOrderRepository.update).not.toHaveBeenCalled();
    });

    it('falls back to placeholder names instead of 500 when the vehicle/customer/technician were removed after creation', async () => {
      const deps = buildManager();
      const updated = { ...baseServiceOrder, technicianId: 'technician-1' };
      deps.serviceOrderRepository.byId.mockResolvedValueOnce(baseServiceOrder).mockResolvedValueOnce(updated);
      deps.vehicleRepository.byId.mockResolvedValue(null);
      deps.customerRepository.byId.mockResolvedValue(null);
      deps.userRepository.byId.mockResolvedValue(null);

      const result = await deps.manager.update(actingUser, { id: 'so-1' });

      expect(result.serviceOrder.customerName).toBe('Cliente removido');
      expect(result.serviceOrder.vehiclePlate).toBe('Veículo removido');
    });
  });

  describe('transition', () => {
    it.each([
      ['OPEN', 'IN_PROGRESS'],
      ['IN_PROGRESS', 'WAITING_PARTS'],
      ['IN_PROGRESS', 'COMPLETED'],
      ['WAITING_PARTS', 'IN_PROGRESS'],
      ['COMPLETED', 'DELIVERED'],
      ['OPEN', 'CANCELLED'],
    ])('allows %s -> %s', async (fromStatus, toStatus) => {
      const deps = buildManager();
      const existing = { ...baseServiceOrder, status: fromStatus };
      const updated = { ...baseServiceOrder, status: toStatus };
      deps.serviceOrderRepository.byId.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);
      deps.serviceOrderRepository.transition.mockResolvedValue({ count: 1 });
      deps.vehicleRepository.byId.mockResolvedValue(baseVehicle);
      deps.customerRepository.byId.mockResolvedValue(baseCustomer);

      const result = await deps.manager.transition(actingUser, { id: 'so-1', toStatus: toStatus as never });

      expect(result.serviceOrder.status).toBe(toStatus);
      expect(deps.statusHistoryRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({ fromStatus, toStatus }),
        FAKE_TX,
      );
    });

    it.each([
      ['OPEN', 'DELIVERED'],
      ['OPEN', 'COMPLETED'],
      ['DELIVERED', 'IN_PROGRESS'],
      ['CANCELLED', 'OPEN'],
    ])('rejects invalid transition %s -> %s with 400', async (fromStatus, toStatus) => {
      const deps = buildManager();
      deps.serviceOrderRepository.byId.mockResolvedValue({ ...baseServiceOrder, status: fromStatus });

      await expect(deps.manager.transition(actingUser, { id: 'so-1', toStatus: toStatus as never })).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        code: 'SERVICE_ORDER_INVALID_STATUS_TRANSITION',
      });
      expect(deps.serviceOrderRepository.transition).not.toHaveBeenCalled();
    });

    it('sets closedAt only when transitioning into DELIVERED or CANCELLED', async () => {
      const deps = buildManager();
      const existing = { ...baseServiceOrder, status: 'COMPLETED' };
      deps.serviceOrderRepository.byId.mockResolvedValueOnce(existing).mockResolvedValueOnce({ ...existing, status: 'DELIVERED' });
      deps.serviceOrderRepository.transition.mockResolvedValue({ count: 1 });
      deps.vehicleRepository.byId.mockResolvedValue(baseVehicle);
      deps.customerRepository.byId.mockResolvedValue(baseCustomer);

      await deps.manager.transition(actingUser, { id: 'so-1', toStatus: 'DELIVERED' as never });

      expect(deps.serviceOrderRepository.transition).toHaveBeenCalledWith(FAKE_TX, 'so-1', 'COMPLETED', 'DELIVERED', expect.any(Date));
    });

    it('rejects with 409 when it loses the race against a concurrent transition', async () => {
      const deps = buildManager();
      deps.serviceOrderRepository.byId.mockResolvedValue({ ...baseServiceOrder, status: 'OPEN' });
      deps.serviceOrderRepository.transition.mockResolvedValue({ count: 0 });

      await expect(deps.manager.transition(actingUser, { id: 'so-1', toStatus: 'IN_PROGRESS' as never })).rejects.toMatchObject({
        status: HttpStatus.CONFLICT,
        code: 'SERVICE_ORDER_INVALID_STATUS_TRANSITION',
      });
      expect(deps.statusHistoryRepository.insert).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('soft deletes regardless of status and records the audit log', async () => {
      const deps = buildManager();
      deps.serviceOrderRepository.byId.mockResolvedValue({ ...baseServiceOrder, status: 'DELIVERED' });
      deps.serviceOrderRepository.softDelete.mockResolvedValue({ count: 1 });
      deps.vehicleRepository.byId.mockResolvedValue(baseVehicle);
      deps.customerRepository.byId.mockResolvedValue(baseCustomer);

      await deps.manager.delete(actingUser, 'so-1');

      expect(deps.serviceOrderRepository.softDelete).toHaveBeenCalledWith('so-1');
      expect(deps.auditLog.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'service_order.deleted' }));
    });

    it('rejects with 404 when deleted concurrently between byId and softDelete', async () => {
      const deps = buildManager();
      deps.serviceOrderRepository.byId.mockResolvedValue(baseServiceOrder);
      deps.serviceOrderRepository.softDelete.mockResolvedValue({ count: 0 });

      await expect(deps.manager.delete(actingUser, 'so-1')).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
    });
  });

  describe('getById', () => {
    it('returns 404 for a non-existent service order', async () => {
      const deps = buildManager();
      deps.serviceOrderRepository.byId.mockResolvedValue(null);

      await expect(deps.manager.getById('missing')).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
    });

    it('populates statusHistory in chronological order', async () => {
      const deps = buildManager();
      deps.serviceOrderRepository.byId.mockResolvedValue(baseServiceOrder);
      deps.vehicleRepository.byId.mockResolvedValue(baseVehicle);
      deps.customerRepository.byId.mockResolvedValue(baseCustomer);
      deps.statusHistoryRepository.byServiceOrderId.mockResolvedValue([
        { id: 'h1', serviceOrderId: 'so-1', fromStatus: null, toStatus: 'OPEN', changedBy: 'user-1', changedAt: new Date() },
      ]);

      const result = await deps.manager.getById('so-1');

      expect(result.serviceOrder.statusHistory).toHaveLength(1);
      expect(result.serviceOrder.statusHistory?.[0].toStatus).toBe('OPEN');
    });
  });

  describe('list', () => {
    it('batches vehicle/customer/technician lookups instead of N+1', async () => {
      const deps = buildManager();
      const withTechnician = { ...baseServiceOrder, technicianId: 'technician-1' };
      deps.serviceOrderRepository.listByTenant.mockResolvedValue({ items: [withTechnician], total: 1 });
      deps.vehicleRepository.byIds.mockResolvedValue([baseVehicle]);
      deps.customerRepository.byIds.mockResolvedValue([baseCustomer]);
      deps.userRepository.byIds.mockResolvedValue([baseTechnician]);

      const result = await deps.manager.list({ offset: 0, limit: 20 });

      expect(deps.vehicleRepository.byIds).toHaveBeenCalledWith(['vehicle-1']);
      expect(deps.userRepository.byIds).toHaveBeenCalledWith(['technician-1']);
      expect(result.items[0].technicianName).toBe('Carlos Mecânico');
    });

    it('filters by status/vehicleId/technicianId', async () => {
      const deps = buildManager();
      deps.serviceOrderRepository.listByTenant.mockResolvedValue({ items: [], total: 0 });
      deps.vehicleRepository.byIds.mockResolvedValue([]);
      deps.customerRepository.byIds.mockResolvedValue([]);
      deps.userRepository.byIds.mockResolvedValue([]);

      await deps.manager.list({ offset: 0, limit: 20, status: 'IN_PROGRESS' as never, vehicleId: 'vehicle-1', technicianId: 'technician-1' });

      expect(deps.serviceOrderRepository.listByTenant).toHaveBeenCalledWith(0, 20, 'IN_PROGRESS', 'vehicle-1', 'technician-1');
    });
  });
});
