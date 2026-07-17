import { Module, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { FIPE_SYNC_QUEUE } from '../../shared/queue/queue.module';
import { FipeController } from './controllers/fipe.controller';
import { FipeManager } from './managers/fipe.manager';
import { FipeBrandRepository } from './repositories/fipe-brand.repository';
import { FipeModelRepository } from './repositories/fipe-model.repository';
import { FipeClientService } from './services/fipe-client.service';
import { FipeSyncProcessor } from './processors/fipe-sync.processor';

// Job repetível: toda segunda 3h da manhã (mesmo horário parado usado pra
// jobs de manutenção em outros projetos — sem tráfego de usuário). Primeiro
// job agendado/repetível deste projeto — ver Gotcha do plano.
const WEEKLY_SYNC_CRON = '0 3 * * 1';
const WEEKLY_SYNC_JOB_ID = 'fipe-weekly-sync';

// `@nestjs/bullmq` sobe um Worker real (conexão Redis própria) pra cada
// provider decorado com @Processor assim que o módulo é instanciado — não
// é algo que o guard NODE_ENV==='test' dentro do onModuleInit ou do
// FipeClientService alcança. Cada arquivo de teste e2e sobe o AppModule
// inteiro em paralelo (processos Jest distintos), então sem essa exclusão
// aqui múltiplos Workers reais ficam conectados à mesma fila/Redis
// compartilhado ao mesmo tempo — a causa raiz por trás do vazamento de job
// entre arquivos de teste já documentado em FipeClientService, e também de
// flakiness de conexão no teardown de arquivos sem nenhum código FIPE (ex:
// health.e2e-spec.ts). Achado ao vivo no Gate 3.5 desta feature.
const FIPE_SYNC_PROCESSOR_PROVIDERS = process.env.NODE_ENV === 'test' ? [] : [FipeSyncProcessor];

@Module({
  controllers: [FipeController],
  providers: [FipeManager, FipeBrandRepository, FipeModelRepository, FipeClientService, ...FIPE_SYNC_PROCESSOR_PROVIDERS],
})
export class FipeModule implements OnModuleInit {
  constructor(
    private readonly brandRepository: FipeBrandRepository,
    @InjectQueue(FIPE_SYNC_QUEUE) private readonly queue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    // NODE_ENV=test (setado pelo Jest por padrão) pula bootstrap e
    // agendamento — cada arquivo de teste e2e sobe o AppModule inteiro em
    // beforeAll; sem essa guarda, toda suíte e2e (não só a da FIPE)
    // dispararia uma sincronização real contra a API pública a cada run,
    // e com a tabela vazia isso significa ~10 sincronizações completas
    // simultâneas — lento, flaky, e desperdiça o rate limit da API externa.
    // Testes que precisam de dado da FIPE semeiam direto no banco
    // (ver fipe.e2e-spec.ts).
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    // Bootstrap: primeira subida com a base vazia dispara uma sincronização
    // imediata, sem depender de alguém rodar POST /fipe/sync manualmente.
    const existingCarBrands = await this.brandRepository.listByCategory('CAR');
    if (existingCarBrands.length === 0) {
      await this.queue.add('sync', {});
    }

    // Registra o job semanal repetível (idempotente — jobId fixo evita
    // duplicar o agendamento a cada restart do processo).
    await this.queue.add(
      'sync',
      {},
      { repeat: { pattern: WEEKLY_SYNC_CRON }, jobId: WEEKLY_SYNC_JOB_ID },
    );
  }
}
