import { Module } from '@nestjs/common';
import { AuditLogModule } from '../../shared/audit-log/audit-log.module';
import { FinancialController } from './controllers/financial.controller';
import { FinancialManager } from './managers/financial.manager';
import { FinancialRepository } from './repositories/financial.repository';

@Module({
  imports: [AuditLogModule],
  controllers: [FinancialController],
  providers: [FinancialManager, FinancialRepository],
})
export class FinancialModule {}
