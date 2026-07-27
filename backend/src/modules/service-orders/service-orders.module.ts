import { Module } from '@nestjs/common';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { CustomersModule } from '../customers/customers.module';
import { IamModule } from '../iam/iam.module';
import { ServiceOrdersController } from './controllers/service-orders.controller';
import { ServiceOrderManager } from './managers/service-order.manager';
import { ServiceOrderRepository } from './repositories/service-order.repository';
import { ServiceOrderStatusHistoryRepository } from './repositories/service-order-status-history.repository';

// Importa VehiclesModule/CustomersModule/IamModule pra ter acesso aos
// repositórios que exportam — ServiceOrderManager valida vehicleId (e lê
// customerId a partir dele) e technicianId. AuditLogService vem do
// AuditLogModule @Global(), não precisa estar aqui.
@Module({
  imports: [VehiclesModule, CustomersModule, IamModule],
  controllers: [ServiceOrdersController],
  providers: [ServiceOrderManager, ServiceOrderRepository, ServiceOrderStatusHistoryRepository],
  // MaintenanceAlertsModule (Feature Motor de Manutenção Preventiva) importa
  // este módulo pra usar ServiceOrderRepository.lastDeliveredClosedAtUnscoped
  // no job diário de scan.
  exports: [ServiceOrderRepository],
})
export class ServiceOrdersModule {}
