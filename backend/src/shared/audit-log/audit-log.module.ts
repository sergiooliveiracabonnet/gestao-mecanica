import { Global, Module } from '@nestjs/common';
import { AuditLogRepository } from './audit-log.repository';
import { AuditLogService } from './audit-log.service';
import { AuditLogProcessor } from './audit-log.processor';

// @Global(): audit log é infraestrutura reutilizável por qualquer módulo
// futuro (Clientes, Veículos, Ordem de Serviço), não só IAM — ver arquitetura.
@Global()
@Module({
  providers: [AuditLogRepository, AuditLogService, AuditLogProcessor],
  exports: [AuditLogService],
})
export class AuditLogModule {}
