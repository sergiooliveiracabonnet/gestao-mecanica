import { Module } from '@nestjs/common';
import { CustomersController } from './controllers/customers.controller';
import { CustomerManager } from './managers/customer.manager';
import { CustomerRepository } from './repositories/customer.repository';

// DocumentValidatorService e AuditLogService vêm de módulos @Global()
// (DocumentsModule, AuditLogModule) — não precisam estar nos providers aqui.
@Module({
  controllers: [CustomersController],
  providers: [CustomerManager, CustomerRepository],
})
export class CustomersModule {}
