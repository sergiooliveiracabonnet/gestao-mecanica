import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { FIPE_CATEGORIES } from '@oficina/contracts';
import { FIPE_SYNC_QUEUE } from '../../../shared/queue/queue.module';
import { FipeBrandRepository } from '../repositories/fipe-brand.repository';
import { FipeModelRepository } from '../repositories/fipe-model.repository';
import { FipeClientService } from '../services/fipe-client.service';

// Delay entre chamadas de modelo por marca — a API pública da FIPE não
// documenta um SLA de rate limit; ~1000 req/9h observado empiricamente,
// uma sincronização completa usa ~300-400 requisições. O delay evita rajar
// tudo de uma vez, não é estritamente necessário pro volume total caber no
// limite. Ver Gotcha no plano.
//
// 0 em NODE_ENV=test: achado ao vivo — se `fipe_brands` já tiver dado (de
// uma sincronização real anterior contra o mesmo Postgres compartilhado
// entre dev e e2e), o worker itera TODAS as marcas locais a cada ciclo
// (não só as novas), e 150ms × centenas de marcas trava o app.close() de
// qualquer teste e2e que dispare POST /fipe/sync (BullMQ espera o job em
// andamento terminar antes de fechar o worker). O client externo já é
// sempre mockado nos testes, então o delay não protege rate limit nenhum
// ali — só desperdiça tempo real.
const REQUEST_DELAY_MS = process.env.NODE_ENV === 'test' ? 0 : 150;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Processor(FIPE_SYNC_QUEUE)
export class FipeSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(FipeSyncProcessor.name);

  constructor(
    private readonly fipeClient: FipeClientService,
    private readonly brandRepository: FipeBrandRepository,
    private readonly modelRepository: FipeModelRepository,
  ) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura exigida por WorkerHost.process; o job não carrega payload usado pela sincronização.
  async process(job: Job): Promise<void> {
    for (const category of FIPE_CATEGORIES) {
      await this.syncCategory(category);
    }
  }

  // Erro numa categoria não impede as outras — cada uma sincroniza de forma
  // independente (Edge Case 2 da spec: API externa fora do ar não apaga
  // dado já sincronizado antes, e um ciclo de sync é sempre incremental).
  private async syncCategory(category: (typeof FIPE_CATEGORIES)[number]): Promise<void> {
    const syncedAt = new Date();

    let apiBrands: Awaited<ReturnType<FipeClientService['fetchBrands']>>;
    try {
      apiBrands = await this.fipeClient.fetchBrands(category);
    } catch (error) {
      this.logger.warn(`Falha ao buscar marcas da categoria ${category}`, error as Error);
      return;
    }

    await this.brandRepository.createMany(
      apiBrands.map((brand) => ({ category, fipeCode: brand.code, name: brand.name, syncedAt })),
    );

    const localBrands = await this.brandRepository.listByCategory(category);

    for (const brand of localBrands) {
      try {
        const apiModels = await this.fipeClient.fetchModels(category, brand.fipeCode);
        await this.modelRepository.createMany(
          apiModels.map((model) => ({ brandId: brand.id, fipeCode: model.code, name: model.name, syncedAt })),
        );
      } catch (error) {
        // Erro numa marca não impede as outras (Edge Case 3 da spec).
        this.logger.warn(`Falha ao buscar modelos da marca ${brand.name} (${category})`, error as Error);
      }
      await delay(REQUEST_DELAY_MS);
    }
  }
}
