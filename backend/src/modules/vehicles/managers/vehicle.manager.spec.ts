import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@oficina/database';
import { VehicleManager } from './vehicle.manager';

const actingUser = { userId: 'user-1', tenantId: 'tenant-1', role: 'ADMIN' as const };

function buildManager() {
  const vehicleRepository = {
    insert: jest.fn(),
    byId: jest.fn(),
    byPlate: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    listByTenant: jest.fn(),
  };
  const customerRepository = {
    byId: jest.fn(),
    byIds: jest.fn(),
    searchIdsByNameOrDocument: jest.fn(),
  };
  const auditLog = { record: jest.fn() };

  const manager = new VehicleManager(vehicleRepository as never, customerRepository as never, auditLog as never);

  return { manager, vehicleRepository, customerRepository, auditLog };
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

describe('VehicleManager', () => {
  describe('create', () => {
    it('creates a vehicle linked to an existing customer and records the audit log', async () => {
      const deps = buildManager();
      deps.customerRepository.byId.mockResolvedValue(baseCustomer);
      deps.vehicleRepository.byPlate.mockResolvedValue(null);
      deps.vehicleRepository.insert.mockResolvedValue(baseVehicle);

      const result = await deps.manager.create(actingUser, {
        customerId: 'customer-1',
        brand: 'Fiat',
        model: 'Uno',
        plate: 'ABC1D23',
      });

      expect(result.vehicle.id).toBe('vehicle-1');
      expect(result.vehicle.customerName).toBe('João da Silva');
      expect(deps.auditLog.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'vehicle.created' }));
    });

    it('rejects a non-existent customerId with 400', async () => {
      const deps = buildManager();
      deps.customerRepository.byId.mockResolvedValue(null);

      await expect(
        deps.manager.create(actingUser, { customerId: 'missing', brand: 'Fiat', model: 'Uno', plate: 'ABC1D23' }),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST, code: 'VEHICLE_CUSTOMER_NOT_FOUND' });
      expect(deps.vehicleRepository.insert).not.toHaveBeenCalled();
    });

    it('rejects a duplicate plate within the same tenant with 409', async () => {
      const deps = buildManager();
      deps.customerRepository.byId.mockResolvedValue(baseCustomer);
      deps.vehicleRepository.byPlate.mockResolvedValue(baseVehicle);

      await expect(
        deps.manager.create(actingUser, { customerId: 'customer-1', brand: 'Fiat', model: 'Uno', plate: 'ABC1D23' }),
      ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
    });

    it('translates a concurrent unique-constraint violation (P2002) into 409, not 500', async () => {
      const deps = buildManager();
      deps.customerRepository.byId.mockResolvedValue(baseCustomer);
      deps.vehicleRepository.byPlate.mockResolvedValue(null);
      deps.vehicleRepository.insert.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' }),
      );

      await expect(
        deps.manager.create(actingUser, { customerId: 'customer-1', brand: 'Fiat', model: 'Uno', plate: 'ABC1D23' }),
      ).rejects.toMatchObject({ status: HttpStatus.CONFLICT, code: 'VEHICLE_PLATE_ALREADY_EXISTS' });
    });
  });

  describe('update', () => {
    it('updates allowed fields', async () => {
      const deps = buildManager();
      deps.vehicleRepository.byId.mockResolvedValueOnce(baseVehicle).mockResolvedValueOnce({ ...baseVehicle, mileage: 50000 });
      deps.customerRepository.byId.mockResolvedValue(baseCustomer);

      const result = await deps.manager.update(actingUser, { id: 'vehicle-1', mileage: 50000 });

      expect(result.vehicle.mileage).toBe(50000);
    });

    it('rejects an update for a non-existent vehicle with 404', async () => {
      const deps = buildManager();
      deps.vehicleRepository.byId.mockResolvedValue(null);

      await expect(deps.manager.update(actingUser, { id: 'missing', brand: 'X' })).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });

    it('rejects changing the plate to one already used by another vehicle in the tenant', async () => {
      const deps = buildManager();
      deps.vehicleRepository.byId.mockResolvedValue(baseVehicle);
      deps.vehicleRepository.byPlate.mockResolvedValue({ ...baseVehicle, id: 'other-vehicle' });

      await expect(deps.manager.update(actingUser, { id: 'vehicle-1', plate: 'XYZ9W88' })).rejects.toMatchObject({
        status: HttpStatus.CONFLICT,
      });
    });

    it('does not check plate uniqueness when the plate is unchanged', async () => {
      const deps = buildManager();
      deps.vehicleRepository.byId.mockResolvedValueOnce(baseVehicle).mockResolvedValueOnce(baseVehicle);
      deps.customerRepository.byId.mockResolvedValue(baseCustomer);

      await deps.manager.update(actingUser, { id: 'vehicle-1', plate: baseVehicle.plate });

      expect(deps.vehicleRepository.byPlate).not.toHaveBeenCalled();
    });

    it('succeeds with a placeholder customer name instead of 500 when the owning customer was removed after vehicle creation', async () => {
      const deps = buildManager();
      deps.vehicleRepository.byId.mockResolvedValueOnce(baseVehicle).mockResolvedValueOnce({ ...baseVehicle, mileage: 60000 });
      deps.customerRepository.byId.mockResolvedValue(null);

      const result = await deps.manager.update(actingUser, { id: 'vehicle-1', mileage: 60000 });

      expect(result.vehicle.customerName).toBe('Cliente removido');
      expect(deps.auditLog.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'vehicle.updated' }));
    });
  });

  describe('delete', () => {
    it('soft deletes and records the audit log', async () => {
      const deps = buildManager();
      deps.vehicleRepository.byId.mockResolvedValue(baseVehicle);
      deps.vehicleRepository.softDelete.mockResolvedValue({ count: 1 });
      deps.customerRepository.byId.mockResolvedValue(baseCustomer);

      await deps.manager.delete(actingUser, 'vehicle-1');

      expect(deps.vehicleRepository.softDelete).toHaveBeenCalledWith('vehicle-1');
      expect(deps.auditLog.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'vehicle.deleted' }));
    });

    it('rejects with 404 when the vehicle is deleted concurrently between byId and softDelete', async () => {
      const deps = buildManager();
      deps.vehicleRepository.byId.mockResolvedValue(baseVehicle);
      deps.vehicleRepository.softDelete.mockResolvedValue({ count: 0 });

      await expect(deps.manager.delete(actingUser, 'vehicle-1')).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
      expect(deps.auditLog.record).not.toHaveBeenCalled();
    });

    it('rejects deleting a non-existent vehicle with 404', async () => {
      const deps = buildManager();
      deps.vehicleRepository.byId.mockResolvedValue(null);

      await expect(deps.manager.delete(actingUser, 'missing')).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
    });
  });

  describe('getById', () => {
    it('returns 404 for a non-existent vehicle', async () => {
      const deps = buildManager();
      deps.vehicleRepository.byId.mockResolvedValue(null);

      await expect(deps.manager.getById('missing')).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
    });

    it('falls back to a placeholder name if the owning customer was removed', async () => {
      const deps = buildManager();
      deps.vehicleRepository.byId.mockResolvedValue(baseVehicle);
      deps.customerRepository.byId.mockResolvedValue(null);

      const result = await deps.manager.getById('vehicle-1');

      expect(result.vehicle.customerName).toBe('Cliente removido');
    });
  });

  describe('list', () => {
    it('batches customer lookups instead of N+1', async () => {
      const deps = buildManager();
      deps.customerRepository.searchIdsByNameOrDocument.mockResolvedValue([]);
      deps.vehicleRepository.listByTenant.mockResolvedValue({ items: [baseVehicle], total: 1 });
      deps.customerRepository.byIds.mockResolvedValue([baseCustomer]);

      const result = await deps.manager.list({ offset: 0, limit: 20, search: 'Uno' });

      expect(deps.vehicleRepository.listByTenant).toHaveBeenCalledWith(0, 20, 'Uno', undefined, []);
      expect(deps.customerRepository.byIds).toHaveBeenCalledWith(['customer-1']);
      expect(result.items[0].customerName).toBe('João da Silva');
    });

    it('filters by customerId when provided', async () => {
      const deps = buildManager();
      deps.vehicleRepository.listByTenant.mockResolvedValue({ items: [], total: 0 });
      deps.customerRepository.byIds.mockResolvedValue([]);

      await deps.manager.list({ offset: 0, limit: 20, customerId: 'customer-1' });

      expect(deps.customerRepository.searchIdsByNameOrDocument).not.toHaveBeenCalled();
      expect(deps.vehicleRepository.listByTenant).toHaveBeenCalledWith(0, 20, undefined, 'customer-1', undefined);
    });

    it('also matches vehicles whose owning customer name or document matches the search term', async () => {
      const deps = buildManager();
      deps.customerRepository.searchIdsByNameOrDocument.mockResolvedValue(['customer-1']);
      deps.vehicleRepository.listByTenant.mockResolvedValue({ items: [baseVehicle], total: 1 });
      deps.customerRepository.byIds.mockResolvedValue([baseCustomer]);

      const result = await deps.manager.list({ offset: 0, limit: 20, search: 'João' });

      expect(deps.customerRepository.searchIdsByNameOrDocument).toHaveBeenCalledWith('João');
      expect(deps.vehicleRepository.listByTenant).toHaveBeenCalledWith(0, 20, 'João', undefined, ['customer-1']);
      expect(result.items[0].plate).toBe('ABC1D23');
    });
  });
});
