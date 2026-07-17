import { FipeManager } from './fipe.manager';

function buildManager() {
  const brandRepository = { createMany: jest.fn(), listByCategory: jest.fn(), byId: jest.fn(), byIds: jest.fn() };
  const modelRepository = { createMany: jest.fn(), listByBrandId: jest.fn(), byId: jest.fn() };
  const queue = { add: jest.fn() };

  const manager = new FipeManager(brandRepository as never, modelRepository as never, queue as never);

  return { manager, brandRepository, modelRepository, queue };
}

describe('FipeManager', () => {
  describe('listBrands', () => {
    it('returns brands from the local repository, never calling any external client', async () => {
      const deps = buildManager();
      deps.brandRepository.listByCategory.mockResolvedValue([{ id: 'b1', name: 'Fiat' }]);

      const result = await deps.manager.listBrands('CAR');

      expect(deps.brandRepository.listByCategory).toHaveBeenCalledWith('CAR');
      expect(result.brands).toEqual([{ id: 'b1', name: 'Fiat' }]);
    });
  });

  describe('listModels', () => {
    it('returns models for a brand id', async () => {
      const deps = buildManager();
      deps.modelRepository.listByBrandId.mockResolvedValue([{ id: 'm1', name: 'Uno' }]);

      const result = await deps.manager.listModels('b1');

      expect(deps.modelRepository.listByBrandId).toHaveBeenCalledWith('b1');
      expect(result.models).toEqual([{ id: 'm1', name: 'Uno' }]);
    });

    it('returns an empty list for a non-existent brand id, never throwing (Edge Case 5)', async () => {
      const deps = buildManager();
      deps.modelRepository.listByBrandId.mockResolvedValue([]);

      const result = await deps.manager.listModels('missing-brand-id');

      expect(result.models).toEqual([]);
    });
  });

  describe('triggerSync', () => {
    it('only enqueues the job, does not wait for it to complete', async () => {
      const deps = buildManager();

      await deps.manager.triggerSync();

      expect(deps.queue.add).toHaveBeenCalledWith('sync', {});
    });
  });
});
