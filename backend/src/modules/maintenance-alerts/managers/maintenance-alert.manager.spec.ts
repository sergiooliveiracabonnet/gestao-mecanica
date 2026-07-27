import { MaintenanceAlertManager } from './maintenance-alert.manager';
import { AppException } from '../../../shared/errors/app-exception';
import { monthsSince } from '../utils/months-since';

function buildManager() {
  const maintenanceAlertRepository = { listByTenant: jest.fn(), byId: jest.fn(), resolve: jest.fn() };
  const vehicleRepository = { byIds: jest.fn(), byId: jest.fn() };
  const customerRepository = { byIds: jest.fn(), byId: jest.fn() };

  const manager = new MaintenanceAlertManager(maintenanceAlertRepository as never, vehicleRepository as never, customerRepository as never);

  return { manager, maintenanceAlertRepository, vehicleRepository, customerRepository };
}

const actingUser = { userId: 'user-1', tenantId: 'tenant-1', role: 'FRONT_DESK' } as never;

describe('MaintenanceAlertManager', () => {
  describe('list', () => {
    it('defaults to status OPEN when none is requested', async () => {
      const deps = buildManager();
      deps.maintenanceAlertRepository.listByTenant.mockResolvedValue({ items: [], total: 0 });
      deps.vehicleRepository.byIds.mockResolvedValue([]);
      deps.customerRepository.byIds.mockResolvedValue([]);

      await deps.manager.list({ offset: 0, limit: 20 });

      expect(deps.maintenanceAlertRepository.listByTenant).toHaveBeenCalledWith(0, 20, 'OPEN');
    });

    it('denormalizes vehicle and customer data and computes monthsOverdue', async () => {
      const deps = buildManager();
      const referenceDate = new Date('2026-01-01T00:00:00.000Z');
      deps.maintenanceAlertRepository.listByTenant.mockResolvedValue({
        items: [
          {
            id: 'alert-1',
            tenantId: 'tenant-1',
            vehicleId: 'vehicle-1',
            customerId: 'customer-1',
            referenceDate,
            status: 'OPEN',
            resolvedAt: null,
            resolvedBy: null,
          },
        ],
        total: 1,
      });
      deps.vehicleRepository.byIds.mockResolvedValue([{ id: 'vehicle-1', brand: 'Fiat', model: 'Uno', plate: 'ABC1234' }]);
      deps.customerRepository.byIds.mockResolvedValue([{ id: 'customer-1', name: 'João' }]);

      const result = await deps.manager.list({ offset: 0, limit: 20, status: 'OPEN' });

      expect(result.items[0]).toMatchObject({
        id: 'alert-1',
        vehicleBrand: 'Fiat',
        vehicleModel: 'Uno',
        vehiclePlate: 'ABC1234',
        customerName: 'João',
        monthsOverdue: monthsSince(referenceDate, new Date()),
      });
    });
  });

  describe('resolve', () => {
    it('resolves an OPEN alert and returns the updated state', async () => {
      const deps = buildManager();
      deps.maintenanceAlertRepository.byId
        .mockResolvedValueOnce({ id: 'alert-1', tenantId: 'tenant-1', vehicleId: 'vehicle-1', customerId: 'customer-1', referenceDate: new Date(), status: 'OPEN', resolvedAt: null, resolvedBy: null })
        .mockResolvedValueOnce({ id: 'alert-1', tenantId: 'tenant-1', vehicleId: 'vehicle-1', customerId: 'customer-1', referenceDate: new Date(), status: 'RESOLVED', resolvedAt: new Date(), resolvedBy: 'user-1' });
      deps.vehicleRepository.byId.mockResolvedValue({ id: 'vehicle-1', brand: 'Fiat', model: 'Uno', plate: 'ABC1234' });
      deps.customerRepository.byId.mockResolvedValue({ id: 'customer-1', name: 'João' });

      const result = await deps.manager.resolve(actingUser, 'alert-1');

      expect(deps.maintenanceAlertRepository.resolve).toHaveBeenCalledWith('alert-1', 'user-1', expect.any(Date));
      expect(result.alert.status).toBe('RESOLVED');
    });

    it('is idempotent — resolving an already RESOLVED alert does not call repository.resolve again', async () => {
      const deps = buildManager();
      const resolvedAlert = {
        id: 'alert-1',
        tenantId: 'tenant-1',
        vehicleId: 'vehicle-1',
        customerId: 'customer-1',
        referenceDate: new Date(),
        status: 'RESOLVED',
        resolvedAt: new Date('2026-01-01T00:00:00.000Z'),
        resolvedBy: 'user-1',
      };
      deps.maintenanceAlertRepository.byId.mockResolvedValue(resolvedAlert);
      deps.vehicleRepository.byId.mockResolvedValue({ id: 'vehicle-1', brand: 'Fiat', model: 'Uno', plate: 'ABC1234' });
      deps.customerRepository.byId.mockResolvedValue({ id: 'customer-1', name: 'João' });

      const result = await deps.manager.resolve(actingUser, 'alert-1');

      expect(deps.maintenanceAlertRepository.resolve).not.toHaveBeenCalled();
      expect(result.alert.resolvedAt).toBe(resolvedAlert.resolvedAt.toISOString());
    });

    it('throws MAINTENANCE_ALERT_NOT_FOUND for an unknown id', async () => {
      const deps = buildManager();
      deps.maintenanceAlertRepository.byId.mockResolvedValue(null);

      await expect(deps.manager.resolve(actingUser, 'missing-id')).rejects.toThrow(AppException);
    });
  });
});
