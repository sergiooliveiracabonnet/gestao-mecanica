import { FipeSyncProcessor } from './fipe-sync.processor';

function buildProcessor() {
  const fipeClient = { fetchBrands: jest.fn(), fetchModels: jest.fn() };
  const brandRepository = { createMany: jest.fn(), listByCategory: jest.fn(), byId: jest.fn(), byIds: jest.fn() };
  const modelRepository = { createMany: jest.fn(), listByBrandId: jest.fn(), byId: jest.fn() };

  const processor = new FipeSyncProcessor(fipeClient as never, brandRepository as never, modelRepository as never);

  return { processor, fipeClient, brandRepository, modelRepository };
}

const fakeJob = {} as never;

describe('FipeSyncProcessor', () => {
  it('syncs brands and models for all 3 categories', async () => {
    const deps = buildProcessor();
    deps.fipeClient.fetchBrands.mockResolvedValue([{ code: '7', name: 'BMW' }]);
    deps.fipeClient.fetchModels.mockResolvedValue([{ code: '100', name: 'Serie 1' }]);
    deps.brandRepository.listByCategory.mockResolvedValue([{ id: 'brand-1', fipeCode: '7', name: 'BMW', category: 'CAR' }]);

    await deps.processor.process(fakeJob);

    expect(deps.fipeClient.fetchBrands).toHaveBeenCalledWith('CAR');
    expect(deps.fipeClient.fetchBrands).toHaveBeenCalledWith('MOTORCYCLE');
    expect(deps.fipeClient.fetchBrands).toHaveBeenCalledWith('TRUCK');
    expect(deps.brandRepository.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ category: 'CAR', fipeCode: '7', name: 'BMW' }),
    ]);
    expect(deps.modelRepository.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ brandId: 'brand-1', fipeCode: '100', name: 'Serie 1' }),
    ]);
  });

  it('a category failing to fetch brands does not stop the other categories from syncing', async () => {
    const deps = buildProcessor();
    deps.fipeClient.fetchBrands.mockImplementation(async (category: string) => {
      if (category === 'CAR') {
        throw new Error('FIPE API respondeu 503');
      }
      return [];
    });
    deps.brandRepository.listByCategory.mockResolvedValue([]);

    await expect(deps.processor.process(fakeJob)).resolves.toBeUndefined();

    expect(deps.fipeClient.fetchBrands).toHaveBeenCalledWith('CAR');
    expect(deps.fipeClient.fetchBrands).toHaveBeenCalledWith('MOTORCYCLE');
    expect(deps.fipeClient.fetchBrands).toHaveBeenCalledWith('TRUCK');
    // CAR falhou logo no fetchBrands — nunca chega a listByCategory/createMany pra CAR,
    // mas MOTORCYCLE e TRUCK completam o ciclo normalmente (nenhuma marca, nada a fazer).
    expect(deps.brandRepository.createMany).not.toHaveBeenCalledWith([
      expect.objectContaining({ category: 'CAR' }),
    ]);
  });

  it('one brand failing to fetch models does not stop the other brands in the same category', async () => {
    const deps = buildProcessor();
    deps.fipeClient.fetchBrands.mockResolvedValue([
      { code: '1', name: 'Marca A' },
      { code: '2', name: 'Marca B' },
    ]);
    deps.brandRepository.listByCategory.mockResolvedValue([
      { id: 'brand-a', fipeCode: '1', name: 'Marca A', category: 'CAR' },
      { id: 'brand-b', fipeCode: '2', name: 'Marca B', category: 'CAR' },
    ]);
    deps.fipeClient.fetchModels.mockImplementation(async (_category: string, brandFipeCode: string) => {
      if (brandFipeCode === '1') {
        throw new Error('timeout');
      }
      return [{ code: '10', name: 'Modelo B' }];
    });

    await deps.processor.process(fakeJob);

    expect(deps.modelRepository.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ brandId: 'brand-b', fipeCode: '10', name: 'Modelo B' }),
    ]);
    // Marca A não teve createMany de modelo chamado com dado nenhum (falhou antes).
    expect(deps.modelRepository.createMany).not.toHaveBeenCalledWith([expect.objectContaining({ brandId: 'brand-a' })]);
  });
});
