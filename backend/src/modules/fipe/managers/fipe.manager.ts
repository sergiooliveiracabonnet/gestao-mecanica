import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import type { FipeBrandResponse, FipeCategory, FipeModelResponse } from '@oficina/contracts';
import { FIPE_SYNC_QUEUE } from '../../../shared/queue/queue.module';
import { FipeBrandRepository } from '../repositories/fipe-brand.repository';
import { FipeModelRepository } from '../repositories/fipe-model.repository';

@Injectable()
export class FipeManager {
  constructor(
    private readonly brandRepository: FipeBrandRepository,
    private readonly modelRepository: FipeModelRepository,
    @InjectQueue(FIPE_SYNC_QUEUE) private readonly queue: Queue,
  ) {}

  // Lê só do banco local — nunca chama a API externa da FIPE (isso só
  // acontece dentro do FipeSyncProcessor).
  async listBrands(category: FipeCategory): Promise<{ brands: FipeBrandResponse[] }> {
    const brands = await this.brandRepository.listByCategory(category);
    return { brands: brands.map((brand) => ({ id: brand.id, name: brand.name })) };
  }

  // brandId inexistente retorna lista vazia (200), não erro — Edge Case 5
  // da spec, mesmo princípio de não vazar existência já usado noutros filtros.
  async listModels(brandId: string): Promise<{ models: FipeModelResponse[] }> {
    const models = await this.modelRepository.listByBrandId(brandId);
    return { models: models.map((model) => ({ id: model.id, name: model.name })) };
  }

  // Só enfileira — não espera o job terminar (POST /fipe/sync responde na
  // hora, ver spec).
  async triggerSync(): Promise<void> {
    await this.queue.add('sync', {});
  }
}
