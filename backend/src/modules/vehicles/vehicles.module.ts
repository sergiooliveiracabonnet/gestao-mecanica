import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { VehiclesController } from './controllers/vehicles.controller';
import { VehicleManager } from './managers/vehicle.manager';
import { VehicleRepository } from './repositories/vehicle.repository';

// Importa CustomersModule pra ter acesso ao CustomerRepository que ele
// exporta — VehicleManager valida customerId contra ele. AuditLogService
// vem do AuditLogModule @Global(), não precisa estar aqui.
// ServiceOrderManager (Feature 5) precisa validar que um vehicleId existe e
// pertence ao tenant, e ler vehicle.customerId — por isso exporta
// VehicleRepository, mesmo padrão do CustomersModule.
@Module({
  imports: [CustomersModule],
  controllers: [VehiclesController],
  providers: [VehicleManager, VehicleRepository],
  exports: [VehicleRepository],
})
export class VehiclesModule {}
