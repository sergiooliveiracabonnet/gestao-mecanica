import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@oficina/database';
import type { DocumentValidationResult } from '../../../shared/documents/document-validator.service';
import { CustomerManager } from './customer.manager';

const actingUser = { userId: 'user-1', tenantId: 'tenant-1', role: 'ADMIN' as const };

function buildManager() {
  const customerRepository = {
    insert: jest.fn(),
    byId: jest.fn(),
    byDocument: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    listByTenant: jest.fn(),
  };
  const documentValidator = {
    validate: jest.fn<DocumentValidationResult, [string]>(() => ({ valid: true, type: 'CPF', normalized: '11144477735' })),
  };
  const auditLog = { record: jest.fn() };

  const manager = new CustomerManager(customerRepository as never, documentValidator as never, auditLog as never);

  return { manager, customerRepository, documentValidator, auditLog };
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

describe('CustomerManager', () => {
  describe('create', () => {
    it('creates a customer and records the audit log', async () => {
      const deps = buildManager();
      deps.customerRepository.byDocument.mockResolvedValue(null);
      deps.customerRepository.insert.mockResolvedValue(baseCustomer);

      const result = await deps.manager.create(actingUser, {
        type: 'PF',
        document: '111.444.777-35',
        name: 'João da Silva',
        phone: '11999998888',
      });

      expect(result.customer.id).toBe('customer-1');
      expect(deps.auditLog.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'customer.created' }));
    });

    it('rejects an invalid document', async () => {
      const deps = buildManager();
      deps.documentValidator.validate.mockReturnValue({ valid: false, type: null, normalized: '123' });

      await expect(
        deps.manager.create(actingUser, { type: 'PF', document: '123', name: 'X', phone: '119999' }),
      ).rejects.toThrow();
    });

    it('rejects a duplicate document within the same tenant with 409', async () => {
      const deps = buildManager();
      deps.customerRepository.byDocument.mockResolvedValue(baseCustomer);

      await expect(
        deps.manager.create(actingUser, {
          type: 'PF',
          document: '111.444.777-35',
          name: 'João da Silva',
          phone: '11999998888',
        }),
      ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
    });

    it('translates a concurrent unique-constraint violation (P2002) into 409, not 500', async () => {
      const deps = buildManager();
      deps.customerRepository.byDocument.mockResolvedValue(null);
      deps.customerRepository.insert.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' }),
      );

      await expect(
        deps.manager.create(actingUser, {
          type: 'PF',
          document: '111.444.777-35',
          name: 'João da Silva',
          phone: '11999998888',
        }),
      ).rejects.toMatchObject({ status: HttpStatus.CONFLICT, code: 'CUSTOMER_DOCUMENT_ALREADY_EXISTS' });
    });

    it('rethrows unrelated database errors', async () => {
      const deps = buildManager();
      deps.customerRepository.byDocument.mockResolvedValue(null);
      deps.customerRepository.insert.mockRejectedValue(new Error('connection lost'));

      await expect(
        deps.manager.create(actingUser, {
          type: 'PF',
          document: '111.444.777-35',
          name: 'João da Silva',
          phone: '11999998888',
        }),
      ).rejects.toThrow('connection lost');
    });
  });

  describe('update', () => {
    it('updates allowed fields and ignores type/document changes', async () => {
      const deps = buildManager();
      deps.customerRepository.byId.mockResolvedValueOnce(baseCustomer).mockResolvedValueOnce({ ...baseCustomer, phone: '11888887777' });

      const result = await deps.manager.update(actingUser, { id: 'customer-1', phone: '11888887777' });

      expect(deps.customerRepository.update).toHaveBeenCalledWith(
        'customer-1',
        expect.not.objectContaining({ type: expect.anything(), document: expect.anything() }),
      );
      expect(result.customer.phone).toBe('11888887777');
    });

    it('rejects an update for a non-existent customer with 404', async () => {
      const deps = buildManager();
      deps.customerRepository.byId.mockResolvedValue(null);

      await expect(deps.manager.update(actingUser, { id: 'missing', name: 'X' })).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });
  });

  describe('delete', () => {
    it('soft deletes and records the audit log', async () => {
      const deps = buildManager();
      deps.customerRepository.byId.mockResolvedValue(baseCustomer);
      deps.customerRepository.softDelete.mockResolvedValue({ count: 1 });

      await deps.manager.delete(actingUser, 'customer-1');

      expect(deps.customerRepository.softDelete).toHaveBeenCalledWith('customer-1');
      expect(deps.auditLog.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'customer.deleted' }));
    });

    it('rejects with 404 when the customer is deleted concurrently between byId and softDelete', async () => {
      const deps = buildManager();
      deps.customerRepository.byId.mockResolvedValue(baseCustomer);
      deps.customerRepository.softDelete.mockResolvedValue({ count: 0 });

      await expect(deps.manager.delete(actingUser, 'customer-1')).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
      expect(deps.auditLog.record).not.toHaveBeenCalled();
    });

    it('rejects deleting a non-existent customer with 404', async () => {
      const deps = buildManager();
      deps.customerRepository.byId.mockResolvedValue(null);

      await expect(deps.manager.delete(actingUser, 'missing')).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
    });
  });

  describe('getById', () => {
    it('returns 404 for a non-existent customer', async () => {
      const deps = buildManager();
      deps.customerRepository.byId.mockResolvedValue(null);

      await expect(deps.manager.getById('missing')).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
    });
  });

  describe('list', () => {
    it('filters by search term across name/document', async () => {
      const deps = buildManager();
      deps.customerRepository.listByTenant.mockResolvedValue({ items: [baseCustomer], total: 1 });

      const result = await deps.manager.list({ offset: 0, limit: 20, search: 'João' });

      expect(deps.customerRepository.listByTenant).toHaveBeenCalledWith(0, 20, 'João');
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });
  });
});
