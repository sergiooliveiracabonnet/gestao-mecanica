import { Global, Module } from '@nestjs/common';
import { DocumentValidatorService } from './document-validator.service';

// @Global(): validação de CPF/CNPJ é usada por IAM (documento do tenant) e
// por Clientes (documento do cliente) — infraestrutura reusável, mesmo
// padrão de AuditLogModule/TenantContextModule.
@Global()
@Module({
  providers: [DocumentValidatorService],
  exports: [DocumentValidatorService],
})
export class DocumentsModule {}
