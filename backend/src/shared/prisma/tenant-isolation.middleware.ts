import { TenantContextService } from '../tenant-context/tenant-context.service';

// Modelos com coluna tenant_id — únicos que passam pelo filtro automático.
// Ao adicionar um model tenant-scoped em uma feature futura (Customer,
// Vehicle, ServiceOrder...), inclua o nome aqui.
const TENANT_SCOPED_MODELS = new Set(['User', 'AuditLog']);

const READ_OPERATIONS = new Set(['findFirst', 'findFirstOrThrow', 'findMany', 'count', 'aggregate', 'groupBy']);
const WRITE_MANY_OPERATIONS = new Set(['updateMany', 'deleteMany']);
const CREATE_OPERATIONS = new Set(['create']);

interface QueryExtensionArgs {
  model?: string;
  operation: string;
  args: Record<string, unknown>;
  query: (args: Record<string, unknown>) => Promise<unknown>;
}

// Prisma Client Extension (não `$use` — removido a partir do Prisma 5) que
// injeta `tenant_id` automaticamente em toda query dos models acima, lendo
// do TenantContextService (AsyncLocalStorage). Repositories NUNCA devem usar
// `findUnique` em models tenant-scoped — só `findFirst`/`findMany`, que
// aceitam filtros arbitrários em `where` e por isso funcionam com a injeção.
export function tenantIsolationExtension(tenantContext: TenantContextService) {
  return {
    name: 'tenant-isolation',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: QueryExtensionArgs) {
          if (!model || !TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const tenantId = tenantContext.getStore()?.tenantId;
          if (!tenantId) {
            return query(args);
          }

          if (READ_OPERATIONS.has(operation) || WRITE_MANY_OPERATIONS.has(operation)) {
            args.where = { ...((args.where as Record<string, unknown>) ?? {}), tenantId };
          } else if (CREATE_OPERATIONS.has(operation)) {
            args.data = { ...((args.data as Record<string, unknown>) ?? {}), tenantId };
          }

          return query(args);
        },
      },
    },
  };
}
