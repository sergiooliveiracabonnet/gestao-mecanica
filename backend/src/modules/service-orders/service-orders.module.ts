import { forwardRef, Module } from '@nestjs/common';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { CustomersModule } from '../customers/customers.module';
import { IamModule } from '../iam/iam.module';
import { MaintenanceAlertsModule } from '../maintenance-alerts/maintenance-alerts.module';
import { ServiceOrdersController } from './controllers/service-orders.controller';
import { ServiceOrderManager } from './managers/service-order.manager';
import { ServiceOrderRepository } from './repositories/service-order.repository';
import { ServiceOrderStatusHistoryRepository } from './repositories/service-order-status-history.repository';
import { ServiceOrderItemRepository } from './repositories/service-order-item.repository';
import { ServiceOrderReceiptRepository } from './repositories/service-order-receipt.repository';
import { ServiceOrderPhotoRepository } from './repositories/service-order-photo.repository';
import { ServiceOrderPhotoManager } from './managers/service-order-photo.manager';
import { ServiceOrderPhotoStorageService } from './services/service-order-photo-storage.service';

// Importa VehiclesModule/CustomersModule/IamModule pra ter acesso aos
// repositórios que exportam — ServiceOrderManager valida vehicleId (e lê
// customerId a partir dele) e technicianId. AuditLogService vem do
// AuditLogModule @Global(), não precisa estar aqui.
// MaintenanceAlertsModule: ServiceOrderManager injeta MaintenanceAlertRepository
// pra resolver automaticamente um alerta obsoleto na transição pra DELIVERED.
// `forwardRef()` porque MaintenanceAlertsModule importa este módulo de volta
// (pra usar ServiceOrderRepository.lastDeliveredClosedAtUnscoped no job) —
// ver comentário em maintenance-alerts.module.ts.
@Module({
  imports: [VehiclesModule, CustomersModule, IamModule, forwardRef(() => MaintenanceAlertsModule)],
  controllers: [ServiceOrdersController],
  providers: [ServiceOrderManager, ServiceOrderPhotoManager, ServiceOrderPhotoStorageService, ServiceOrderRepository, ServiceOrderStatusHistoryRepository, ServiceOrderItemRepository, ServiceOrderReceiptRepository, ServiceOrderPhotoRepository],
  // MaintenanceAlertsModule (Feature Motor de Manutenção Preventiva) importa
  // este módulo pra usar ServiceOrderRepository.lastDeliveredClosedAtUnscoped
  // no job diário de scan.
  exports: [ServiceOrderRepository, ServiceOrderManager],
})
export class ServiceOrdersModule {}
