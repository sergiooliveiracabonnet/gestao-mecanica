import { HttpStatus } from '@nestjs/common';
import { FinancialManager } from './financial.manager';

const user = { userId: 'user-1', tenantId: 'tenant-1', role: 'ADMIN' as const };

function buildManager() {
  const repository = {
    categories: jest.fn().mockResolvedValue([]),
    ensureDefaultCategories: jest.fn(),
    categoryById: jest.fn(),
    createCategory: jest.fn(),
    deleteCategory: jest.fn(),
    createEntry: jest.fn(),
    entryById: jest.fn(),
    entries: jest.fn().mockResolvedValue([]),
    settleEntry: jest.fn(),
    deleteEntry: jest.fn(),
    receipts: jest.fn().mockResolvedValue([]),
    pendingInstallments: jest.fn().mockResolvedValue([]),
    suppliersByIds: jest.fn().mockResolvedValue([]),
    supplierById: jest.fn(),
    suppliers: jest.fn().mockResolvedValue([]),
    customersByIds: jest.fn().mockResolvedValue([]),
    customerById: jest.fn(),
    createSupplier: jest.fn(),
    updateSupplier: jest.fn(),
    deleteSupplier: jest.fn(),
  };
  const audit = { record: jest.fn() };
  return { manager: new FinancialManager(repository as never, audit as never), repository, audit };
}

describe('FinancialManager', () => {
  it('rejects an entry whose category has a different nature', async () => {
    const { manager, repository } = buildManager();
    repository.categoryById.mockResolvedValue({ id: 'cat-1', type: 'EXPENSE' });
    await expect(manager.createEntry(user, {
      categoryId: 'cat-1', type: 'INCOME', description: 'Venda', amountCents: 1000, dueAt: '2026-07-30T12:00:00Z',
    })).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
  });

  it('requires an active supplier for accounts payable', async () => {
    const { manager, repository } = buildManager();
    repository.categoryById.mockResolvedValue({ id: 'cat-1', type: 'EXPENSE' });
    await expect(manager.createEntry(user, {
      categoryId: 'cat-1', type: 'EXPENSE', description: 'Compra de peças', amountCents: 1000, dueAt: '2026-07-30T12:00:00Z',
    })).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    expect(repository.createEntry).not.toHaveBeenCalled();
  });

  it('requires an existing customer for accounts receivable', async () => {
    const { manager, repository } = buildManager();
    repository.categoryById.mockResolvedValue({ id: 'cat-1', type: 'INCOME' });
    await expect(manager.createEntry(user, {
      categoryId: 'cat-1', type: 'INCOME', description: 'Receita avulsa', amountCents: 1000, dueAt: '2026-07-30T12:00:00Z',
    })).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    expect(repository.createEntry).not.toHaveBeenCalled();
  });

  it('calculates realized and projected cash without treating projections as cash', async () => {
    const { manager, repository } = buildManager();
    repository.entries.mockResolvedValue([
      { id: 'e1', categoryId: 'c1', type: 'EXPENSE', description: 'Aluguel', amountCents: 3000, dueAt: new Date(), status: 'PAID', paidAt: new Date(), notes: null },
      { id: 'e2', categoryId: 'c1', type: 'EXPENSE', description: 'Energia', amountCents: 1000, dueAt: new Date(), status: 'PENDING', paidAt: null, notes: null },
    ]);
    repository.categories.mockResolvedValue([{ id: 'c1', name: 'Estrutura', type: 'EXPENSE', group: 'Despesas fixas', color: null, isSystem: false }]);
    repository.receipts.mockResolvedValue([{ id: 'r1', serviceOrderId: 'so1', amountCents: 10000, receivedAt: new Date() }]);
    repository.pendingInstallments.mockResolvedValue([{ id: 'i1', serviceOrderId: 'so2', installmentNumber: 1, installmentCount: 2, amountCents: 5000, dueAt: new Date(), status: 'PENDING' }]);

    const result = await manager.cashFlow({ startAt: '2026-07-01T00:00:00Z', endAt: '2026-08-01T00:00:00Z' });
    expect(result.realizedBalanceCents).toBe(7000);
    expect(result.projectedBalanceCents).toBe(11000);
  });
});
