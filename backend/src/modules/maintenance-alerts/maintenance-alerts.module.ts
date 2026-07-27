import { forwardRef, Module, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { MAINTENANCE_ALERTS_QUEUE } from '../../shared/queue/queue.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { ServiceOrdersModule } from '../service-orders/service-orders.module';
import { IamModule } from '../iam/iam.module';
import { CustomersModule } from '../customers/customers.module';
import { MaintenanceAlertsController } from './controllers/maintenance-alerts.controller';
import { MaintenanceAlertManager } from './managers/maintenance-alert.manager';
import { MaintenanceAlertRepository } from './repositories/maintenance-alert.repository';
import { MaintenanceAlertScanProcessor } from './processors/maintenance-alert-scan.processor';

// Job repetível: todo dia às 4h da manhã (mesmo racional de horário parado
// da FIPE — sem tráfego de usuário). Diferente da FIPE (fila semanal), este
// scan precisa rodar diariamente porque o limiar é em meses, mas o dado
// muda (novas OS entregues) todo dia.
const DAILY_SCAN_CRON = '0 4 * * *';
const DAILY_SCAN_JOB_ID = 'maintenance-alerts-daily-scan';

// `@nestjs/bullmq` sobe um Worker real (conexão Redis própria) pra cada
// provider decorado com @Processor assim que o módulo é instanciado — não é
// algo que o guard NODE_ENV==='test' dentro do onModuleInit alcança. Cada
// arquivo de teste e2e sobe o AppModule inteiro em paralelo (processos Jest
// distintos), então sem esta exclusão múltiplos Workers reais ficam
// conectados à mesma fila/Redis compartilhado ao mesmo tempo — mesmo achado
// já documentado em FipeModule (Gate 3.5 daquela feature).
const MAINTENANCE_ALERT_SCAN_PROCESSOR_PROVIDERS = process.env.NODE_ENV === 'test' ? [] : [MaintenanceAlertScanProcessor];

// Ciclo de módulos: ServiceOrderManager precisa resolver automaticamente um
// alerta obsoleto quando uma OS chega a DELIVERED (importa este módulo pra
// usar MaintenanceAlertRepository), e este módulo importa ServiceOrdersModule
// pra usar ServiceOrderRepository.lastDeliveredClosedAtUnscoped no job diário.
// `forwardRef()` nos dois lados resolve o ciclo sem alargar o que fica
// injetável em toda a aplicação (ao contrário de marcar um dos dois como
// `@Global()`) — ver seção "Decisão de arquitetura" do plano.
@Module({
  imports: [VehiclesModule, forwardRef(() => ServiceOrdersModule), IamModule, CustomersModule],
  controllers: [MaintenanceAlertsController],
  providers: [MaintenanceAlertManager, MaintenanceAlertRepository, ...MAINTENANCE_ALERT_SCAN_PROCESSOR_PROVIDERS],
  exports: [MaintenanceAlertRepository],
})
export class MaintenanceAlertsModule implements OnModuleInit {
  constructor(@InjectQueue(MAINTENANCE_ALERTS_QUEUE) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    // Pula em teste: cada arquivo e2e sobe o AppModule inteiro em paralelo —
    // sem esta guarda, cada um registraria o job repetível e disputaria o
    // mesmo Redis compartilhado (mesmo raciocínio do FipeModule).
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    await this.queue.add(
      'scan',
      {},
      {
        repeat: { pattern: DAILY_SCAN_CRON },
        jobId: DAILY_SCAN_JOB_ID,
      },
    );
  }
}
