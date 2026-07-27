import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { IamModule } from '../iam/iam.module';
import { ServiceOrdersModule } from '../service-orders/service-orders.module';
import { AppointmentsController } from './controllers/appointments.controller';
import { AppointmentManager } from './managers/appointment.manager';
import { AppointmentRepository } from './repositories/appointment.repository';

@Module({
  imports: [CustomersModule, VehiclesModule, IamModule, ServiceOrdersModule],
  controllers: [AppointmentsController],
  providers: [AppointmentManager, AppointmentRepository],
})
export class AppointmentsModule {}
