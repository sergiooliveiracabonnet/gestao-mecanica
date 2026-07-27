# Plan: Motor de Manutenção Preventiva

**Spec**: .planning/specs/motor-manutencao-preventiva.md
**Epic**: crm-avancado-cliente-manutencao-preventiva (Feature 7)
**Created**: 2026-07-26
**Status**: draft

---

## Stack

Full-stack, módulo novo isolado (`maintenance-alerts`), mesmo padrão
estrutural do módulo `fipe` (Feature Integração FIPE). Diferenças desta
feature em relação ao precedente:

- **Segundo job BullMQ agendado/repetível do projeto** — o primeiro é
  `FipeSyncProcessor` (cron semanal). Aqui o cron é diário e, ao
  contrário da FIPE, o job precisa iterar **todos os tenants**, não um
  catálogo global único.
- **Job precisa ler/escrever tabelas tenant-scoped fora de uma
  requisição autenticada** — não existe `AsyncLocalStorage` ativo
  dentro de um `WorkerHost.process()`. O precedente exato pra isso já
  existe no projeto: `AuditLogRepository` sempre usa
  `this.prisma.unscoped` com `tenantId` explícito, porque
  "o processor da fila roda fora do AsyncLocalStorage da requisição
  original" (comentário no próprio arquivo). Este plano segue
  exatamente esse precedente — ver Gotchas.
- **Efeito colateral em outro módulo já existente** (`ServiceOrderManager
  .transition`) — quando uma OS chega a `DELIVERED`, precisa resolver
  automaticamente um alerta obsoleto. Ver como isso evita um ciclo de
  módulos abaixo.
- **Nenhuma chamada externa** — ao contrário da FIPE, todo dado já está
  no próprio Postgres (`vehicles`, `service_orders`); não há `Service`
  layer aqui, só Repository/Manager/Processor.

---

## Decisão de arquitetura: evitando ciclo de módulos

`ServiceOrderManager.transition()` precisa resolver um alerta obsoleto
(módulo novo), e o job do módulo novo precisa ler dado de `Vehicle` e
`ServiceOrder` (módulos existentes). Se `ServiceOrdersModule` importasse
`MaintenanceAlertsModule` **e** `MaintenanceAlertsModule` importasse
`ServiceOrdersModule` de volta, seria um ciclo — exatamente o tipo de
problema que `SERVICES_AND_BEANS.md` manda resolver por arquitetura, não
por `forwardRef()`.

Fix: `MaintenanceAlertsModule` é `@Global()` (mesmo padrão de
`AuditLogModule`) e exporta `MaintenanceAlertRepository`.
`ServiceOrderManager` injeta esse repositório **direto no construtor**,
sem `ServiceOrdersModule` precisar importar `MaintenanceAlertsModule`
(comentário já existe em `service-orders.module.ts` pra `AuditLogService`:
"vem do AuditLogModule @Global(), não precisa estar aqui" — mesma lógica).

Direção do grafo de módulos fica assim, sem ciclo:

```
MaintenanceAlertsModule ──imports──> VehiclesModule
MaintenanceAlertsModule ──imports──> ServiceOrdersModule
MaintenanceAlertsModule ──imports──> IamModule
ServiceOrdersModule     ──DI global, sem import──> MaintenanceAlertRepository
```

E a resolução automática roda **dentro da mesma transação** da
transição de status (`this.prisma.transaction(...)` já existente em
`ServiceOrderManager.transition`), não via fila/evento assíncrono —
mais correto pra um efeito que precisa ser atômico com a mudança de
status (`TRANSACTIONS.md`).

---

## Architecture

### Components

| Component | Type | Purpose |
|---|---|---|
| `MaintenanceAlertRepository` | Repository | métodos escopados (`listByTenant`, `byId`, `resolve`, `resolveOpenByVehicleId`) e métodos `unscoped` só pro job (`upsertOpenAlert`) |
| `MaintenanceAlertScanProcessor` | BullMQ Processor | worker do job diário — itera tenants → veículos → decide e grava alerta |
| `MaintenanceAlertManager` | Manager | `list`, `resolve` — denormaliza veículo/cliente, calcula `monthsOverdue` |
| `MaintenanceAlertsController` | Controller | as 2 rotas HTTP |
| `MaintenanceAlertsModule` | Module | `@Global()`; wire; `onModuleInit` registra o job diário repetível |
| `monthsSince()` | Util puro | calcula meses inteiros entre `referenceDate` e `now`, usado pelo processor (decidir se é devido) e pelo manager (exibir `monthsOverdue`) |
| `maintenance-alerts-api.ts` | Frontend API client | chama os 2 endpoints |
| `use-maintenance-alerts.ts` | Frontend hooks | `useMaintenanceAlertsList`, `useResolveMaintenanceAlert` |
| `MaintenanceAlertsTable.tsx` | Frontend component | tabela + botão resolver + estado vazio |

### File Locations

**Contratos compartilhados (`packages/contracts/`)**
| File | Location | Purpose |
|---|---|---|
| `maintenance-alert.response.ts` | `src/response/` | `MAINTENANCE_ALERT_STATUSES`, `MaintenanceAlertStatus`, `MaintenanceAlertResponse` |
| `maintenance-alert.request.ts` | `src/request/` | `MaintenanceAlertListRequest`, `ResolveMaintenanceAlertRequest` |

**Backend (`backend/src/modules/maintenance-alerts/`)**
| File | Location | Purpose |
|---|---|---|
| `maintenance-alert.repository.ts` | `repositories/` | acesso a `maintenance_alerts` (escopado + unscoped) |
| `maintenance-alert-scan.processor.ts` (+ `.spec.ts`) | `processors/` | worker BullMQ do scan diário |
| `maintenance-alert.manager.ts` (+ `.spec.ts`) | `managers/` | leitura + resolução |
| `maintenance-alert.dto.ts` | `dto/` | `MaintenanceAlertListDto`, `ResolveMaintenanceAlertDto` |
| `maintenance-alerts.controller.ts` | `controllers/` | rotas |
| `months-since.ts` (+ `.spec.ts`) | `utils/` | função pura de cálculo de meses |
| `maintenance-alerts.module.ts` | `modules/maintenance-alerts/` | `@Global()`; wire + job repetível |

**Backend (migrations/schema)**
| File | Location | Purpose |
|---|---|---|
| `7_maintenance_alerts/migration.sql` | `database/prisma/migrations/` | `CREATE TABLE maintenance_alerts` + índices |

**Backend (testes)**
| File | Location | Purpose |
|---|---|---|
| `maintenance-alerts.e2e-spec.ts` | `backend/test/` | endpoints + isolamento + auto-resolve na transição pra `DELIVERED` |

**Frontend (`frontend/`)**
| File | Location | Purpose |
|---|---|---|
| `maintenance-alerts-api.ts` | `features/maintenance-alerts/api/` | chamadas HTTP |
| `use-maintenance-alerts.ts` | `features/maintenance-alerts/hooks/` | hooks React Query |
| `MaintenanceAlertsTable.tsx` (+ `__tests__/`) | `features/maintenance-alerts/components/` | tabela + resolver + estado vazio |
| `page.tsx` | `app/(dashboard)/maintenance-alerts/` | rota do painel |

### Files to Change

| File | What Changes | Why |
|---|---|---|
| `database/prisma/schema.prisma` | adiciona `model MaintenanceAlert` | nova tabela, `tenantId` presente |
| `backend/src/shared/prisma/tenant-isolation.middleware.ts` | adiciona `'MaintenanceAlert'` a `TENANT_SCOPED_MODELS` | é dado de tenant, precisa do filtro automático nas queries escopadas (`client`) |
| `backend/src/shared/errors/app-error-code.ts` | adiciona `MAINTENANCE_ALERT_NOT_FOUND` | erro do `resolve` com id inexistente/outro tenant |
| `backend/src/shared/queue/queue.module.ts` | `export const MAINTENANCE_ALERTS_QUEUE = 'maintenance-alerts-scan'` + `registerQueue` | fila nova, mesmo padrão de `FIPE_SYNC_QUEUE` |
| `backend/src/modules/vehicles/repositories/vehicle.repository.ts` | novo método `listActiveForTenantUnscoped(tenantId, offset, limit)` | job precisa paginar veículos de um tenant fora de contexto autenticado |
| `backend/src/modules/service-orders/repositories/service-order.repository.ts` | novo método `lastDeliveredClosedAtUnscoped(vehicleId)` | job precisa da referência de manutenção sem contexto de tenant |
| `backend/src/modules/service-orders/service-orders.module.ts` | adiciona `exports: [ServiceOrderRepository]` | `MaintenanceAlertsModule` importa este módulo pra usar o método acima |
| `backend/src/modules/service-orders/managers/service-order.manager.ts` | injeta `MaintenanceAlertRepository`; em `transition()`, dentro da transação existente, se `toStatus === 'DELIVERED'` chama `resolveOpenByVehicleId(tx, existing.vehicleId, changedAt)` | Edge Case 4 da spec — nova OS entregue resolve alerta obsoleto atomicamente |
| `backend/src/modules/iam/repositories/tenant.repository.ts` | novo método `listAllUnscoped(offset, limit)` | job precisa iterar todos os tenants |
| `backend/src/modules/iam/iam.module.ts` | adiciona `TenantRepository` a `exports` | hoje só `UserRepository` é exportado; `MaintenanceAlertsModule` precisa do novo método de `TenantRepository` |
| `backend/src/app.module.ts` | importa `MaintenanceAlertsModule` | registra o módulo novo |
| `frontend/components/dashboard/sidebar.tsx` | novo item `{ href: '/maintenance-alerts', label: 'Alertas de Manutenção', icon: Bell }` entre "Ordens de Serviço" e "Usuários" | navegação pro painel novo |

---

## Phases

### Phase 1: Banco de dados

| # | Task | Files |
|---|------|-------|
| 1 | `model MaintenanceAlert` (`tenantId`, `vehicleId`, `customerId`, `referenceDate`, `status` default `"OPEN"`, `resolvedAt?`, `resolvedBy?`; índice único `(vehicleId, referenceDate)`; índice `(tenantId, status)`) | `database/prisma/schema.prisma` |
| 2 | Migration SQL: `CREATE TABLE maintenance_alerts` + os 2 índices | `database/prisma/migrations/7_maintenance_alerts/migration.sql` |
| 3 | Adiciona `'MaintenanceAlert'` a `TENANT_SCOPED_MODELS` | `shared/prisma/tenant-isolation.middleware.ts` |

**Sequential**: 1 → 2 → 3.

### Phase 2: Contratos compartilhados

| # | Task | Files |
|---|------|-------|
| 4 | `MAINTENANCE_ALERT_STATUSES = ['OPEN', 'RESOLVED']`, `MaintenanceAlertStatus`, `MaintenanceAlertResponse` (campos denormalizados: `vehicleBrand/Model/Plate`, `customerName`, `referenceDate`, `monthsOverdue`, `status`, `resolvedAt?`, `resolvedBy?` — mesmo padrão flat de `ServiceOrderResponse`, nunca objeto aninhado) | `packages/contracts/src/response/maintenance-alert.response.ts` |
| 5 | `MaintenanceAlertListRequest extends PageableRequest { status? }`, `ResolveMaintenanceAlertRequest { id }` | `packages/contracts/src/request/maintenance-alert.request.ts` |
| 6 | Exportar os dois arquivos no barrel | `packages/contracts/src/index.ts` |
| 7 | `pnpm --filter @oficina/contracts run build` | — |

**Sequential**: 4, 5 → 6 → 7.

### Phase 3: Backend — camada de dados (métodos novos em repositórios existentes)

| # | Task | Files |
|---|------|-------|
| 8 | `VehicleRepository.listActiveForTenantUnscoped(tenantId, offset, limit)` — `this.prisma.unscoped.vehicle.findMany({ where: { tenantId, deletedAt: null }, orderBy: { id: 'asc' }, skip, take })`; comentário explícito: só o job chama isso, nunca um controller | `modules/vehicles/repositories/vehicle.repository.ts` |
| 9 | `ServiceOrderRepository.lastDeliveredClosedAtUnscoped(vehicleId)` — `this.prisma.unscoped.serviceOrder.findFirst({ where: { vehicleId, status: 'DELIVERED', deletedAt: null }, orderBy: { closedAt: 'desc' }, select: { closedAt: true } })` | `modules/service-orders/repositories/service-order.repository.ts` |
| 10 | `exports: [ServiceOrderRepository]` | `modules/service-orders/service-orders.module.ts` |
| 11 | `TenantRepository.listAllUnscoped(offset, limit)` — `this.prisma.unscoped.tenant.findMany({ where: { deletedAt: null }, orderBy: { id: 'asc' }, skip, take })` | `modules/iam/repositories/tenant.repository.ts` |
| 12 | `exports: [..., TenantRepository]` | `modules/iam/iam.module.ts` |

**Parallel**: 8, 9, 11 são independentes. **Sequential**: 10 depende de 9; 12 depende de 11.

### Phase 4: Backend — módulo novo (dados + job)

| # | Task | Files |
|---|------|-------|
| 13 | `monthsSince(reference: Date, now: Date): number` — diferença em meses inteiros por ano/mês/dia (sem lib de data nova, projeto não tem `date-fns`/`dayjs`) | `modules/maintenance-alerts/utils/months-since.ts` |
| 14 | Testes unitários de `monthsSince`: exatos 6 meses, 5 meses e 29 dias, virada de ano, dia do mês maior/menor | `modules/maintenance-alerts/utils/months-since.spec.ts` |
| 15 | `MaintenanceAlertRepository`: `listByTenant(offset, limit, status)` (escopado, `orderBy: referenceDate asc`), `byId(id)` (escopado), `resolve(id, resolvedBy, resolvedAt)` (escopado, `updateMany where status='OPEN'` — idempotente), `resolveOpenByVehicleId(tx, vehicleId, resolvedAt)` (escopado via `tx`, chamado de dentro da transação do `ServiceOrderManager`), `upsertOpenAlert({tenantId, vehicleId, customerId, referenceDate})` (`unscoped`, `upsert` no índice único `vehicleId_referenceDate`, `update: {}` — nunca sobrescreve um alerta já `RESOLVED` do mesmo ciclo) | `modules/maintenance-alerts/repositories/maintenance-alert.repository.ts` |
| 16 | `MAINTENANCE_ALERTS_QUEUE` const + `registerQueue` | `shared/queue/queue.module.ts` |
| 17 | `MaintenanceAlertScanProcessor.process()`: itera tenants em chunks (`TENANT_CHUNK_SIZE`/`TENANT_MAX_CHUNKS`) via `TenantRepository.listAllUnscoped`; pra cada tenant, itera veículos em chunks (`VEHICLE_CHUNK_SIZE`/`VEHICLE_MAX_CHUNKS`) via `VehicleRepository.listActiveForTenantUnscoped`; pra cada veículo, busca `lastDeliveredClosedAtUnscoped`, calcula `referenceDate = lastDelivered ?? vehicle.createdAt`, se `monthsSince(referenceDate, now) >= 6` chama `upsertOpenAlert`; erro num veículo é logado (`logger.warn`) e não interrompe os demais (mesmo padrão `runCatching` de `BATCH_PROCESSING.md`) | `modules/maintenance-alerts/processors/maintenance-alert-scan.processor.ts` |
| 18 | Testes unitários do processor: veículo 7 meses sem OS `DELIVERED` → `upsertOpenAlert` chamado; veículo 3 meses → não chamado; veículo nunca entregue, cadastro 8 meses → usa `createdAt`; falha ao processar um veículo não interrompe os demais da mesma página; paginação respeita `MAX_CHUNKS` (mock retornando sempre página cheia não entra em loop infinito) | `modules/maintenance-alerts/processors/maintenance-alert-scan.processor.spec.ts` |

**Sequential**: 13 → 14. 15 depende de 3 (schema/middleware), 7 (contratos). 17 depende de 8, 9, 15, 16, 13. 18 depende de 17.

### Phase 5: Backend — API

| # | Task | Files |
|---|------|-------|
| 19 | `MaintenanceAlertListDto` (`status?` com `@IsIn(MAINTENANCE_ALERT_STATUSES)`, `offset`/`limit` padrão 0/20), `ResolveMaintenanceAlertDto` (`id` com `@IsUUID('4')`) | `modules/maintenance-alerts/dto/maintenance-alert.dto.ts` |
| 20 | `MaintenanceAlertManager.list(request)`: default `status = request.status ?? 'OPEN'`, busca alertas, denormaliza veículo (`VehicleRepository.byIds`) e cliente (`CustomerRepository.byIds`, mesmo padrão N+1-safe de `ServiceOrderManager.list`), calcula `monthsOverdue` com `monthsSince`; `.resolve(actingUser, id)`: busca por id (escopado — 404 se não achar, cobre isolamento entre tenants), se já `RESOLVED` retorna sem re-escrever (idempotente), senão chama `repository.resolve` e re-busca | `modules/maintenance-alerts/managers/maintenance-alert.manager.ts` |
| 21 | Testes unitários do manager: `monthsOverdue` calculado certo; filtro de status default `OPEN`; `resolve` idempotente (chamar duas vezes não sobrescreve `resolvedAt`); `resolve` com id inexistente lança `MAINTENANCE_ALERT_NOT_FOUND` | `modules/maintenance-alerts/managers/maintenance-alert.manager.spec.ts` |
| 22 | `MaintenanceAlertsController` sob `@Controller('api/v1')`, `@Roles('ADMIN','MANAGER','FRONT_DESK','MECHANIC')` nos 2 endpoints (`POST maintenance-alerts/list`, `POST maintenance-alerts/resolve`) | `modules/maintenance-alerts/controllers/maintenance-alerts.controller.ts` |
| 23 | `MaintenanceAlertsModule`: `@Global()`; `imports: [VehiclesModule, ServiceOrdersModule, IamModule]`; `providers`; `controllers`; `exports: [MaintenanceAlertRepository]`; `onModuleInit` registra o job repetível diário (`queue.add('scan', {}, { repeat: { pattern: '0 4 * * *' }, jobId: 'maintenance-alerts-daily-scan' })`), pulando em `NODE_ENV=test` (mesmo guard da FIPE) | `modules/maintenance-alerts/maintenance-alerts.module.ts` |
| 24 | Registro em `app.module.ts` | `app.module.ts` |
| 25 | `MaintenanceAlertRepository` injetado em `ServiceOrderManager`; em `transition()`, dentro do `this.prisma.transaction`, após a transição de status ser aplicada com sucesso, se `request.toStatus === 'DELIVERED'` chama `this.maintenanceAlertRepository.resolveOpenByVehicleId(tx, existing.vehicleId, changedAt)` | `modules/service-orders/managers/service-order.manager.ts` |
| 26 | `MAINTENANCE_ALERT_NOT_FOUND` no enum | `shared/errors/app-error-code.ts` |

**Sequential**: 19 → 20 → 21. 22 depende de 20. 23 depende de 15-22. 24 depende de 23. 25 depende de 15, 23 (repositório precisa existir e ser exportado — mas por ser `@Global()`, a ordem de import em `app.module.ts` não bloqueia a injeção).

### Phase 6: Backend — testes e2e

| # | Task | Files |
|---|------|-------|
| 27 | `maintenance-alerts.e2e-spec.ts`: seed direto no banco (`prisma.unscoped.maintenanceAlert.create`, sem rodar o job de verdade) → `POST /maintenance-alerts/list` retorna só `OPEN` por padrão, filtro `status=RESOLVED` funciona, ordenado por `referenceDate` crescente; `POST /maintenance-alerts/resolve` marca `RESOLVED` com `resolvedBy` do usuário autenticado; resolver duas vezes retorna 200 sem erro e sem mudar `resolvedAt` da primeira vez (Edge Case 8); alerta de outro tenant no `resolve` retorna 404 (Edge Case 9); alerta de outro tenant não aparece no `list` (isolamento); **fluxo de auto-resolve**: cria OS via API, transiciona até `DELIVERED`, com um alerta `OPEN` pré-existente pro mesmo veículo (referência antiga) — confirma que ele vira `RESOLVED` como efeito colateral do `POST /service-orders/transition` (Edge Case 4) | `backend/test/maintenance-alerts.e2e-spec.ts` |

### Phase 7: Frontend

| # | Task | Files |
|---|------|-------|
| 28 | `maintenance-alerts-api.ts`: `list(request)`, `resolve(request)` | `features/maintenance-alerts/api/maintenance-alerts-api.ts` |
| 29 | `use-maintenance-alerts.ts`: `useMaintenanceAlertsList(request)` (`placeholderData` mantém a página anterior visível durante refetch — evita flash, mesmo padrão de `useServiceOrdersList`), `useResolveMaintenanceAlert()` (invalida a lista no `onSuccess`) | `features/maintenance-alerts/hooks/use-maintenance-alerts.ts` |
| 30 | `MaintenanceAlertsTable.tsx`: colunas Veículo (marca/modelo/placa), Cliente (nome, `Link` pra `/customers` — sem deep-link por id, ver Gotchas), "Devendo há" (`monthsOverdue` meses), botão "Marcar como resolvido" (chama `useResolveMaintenanceAlert`, desabilita durante `isPending`); estado vazio "Nenhum veículo devendo revisão no momento"; estado de erro com retry | `features/maintenance-alerts/components/MaintenanceAlertsTable.tsx` |
| 31 | `app/(dashboard)/maintenance-alerts/page.tsx`: `Select` de status (Devendo/Resolvidos, default Devendo), paginação `offset`/`limit=20` (mesmo padrão de `ServiceOrdersPage`) | `app/(dashboard)/maintenance-alerts/page.tsx` |
| 32 | Novo item de navegação (`Bell`, entre Ordens de Serviço e Usuários) | `components/dashboard/sidebar.tsx` |
| 33 | Testes de componente: `MaintenanceAlertsTable` — estado vazio, renderização de `monthsOverdue`, clique em "Marcar como resolvido" chama a mutação e desabilita o botão durante o pending | `features/maintenance-alerts/components/__tests__/MaintenanceAlertsTable.test.tsx` |

**Sequential**: 28 → 29 → 30 → 31 → 32 → 33 (28 depende de 7).

---

## Parallel vs Sequential

| Parallel Group | Tasks | Why |
|---|---|---|
| Group A | 8, 9, 11 | métodos novos em repositórios diferentes, sem dependência cruzada |
| Group B | 4, 5 | arquivos de contrato independentes |

| Sequential | Depends On | Why |
|---|---|---|
| Task 2 | Task 1 | migration usa nomes de coluna do schema |
| Task 3 | Task 1 | precisa do model existir antes de referenciar o nome no Set |
| Task 7 | Tasks 4, 5, 6 | rebuild do pacote depois de editar contratos |
| Tasks 8-33 | Task 7 | backend e frontend importam os tipos novos de `@oficina/contracts` |
| Task 17 | Tasks 8, 9, 13, 15, 16 | processor usa os 2 métodos unscoped + repositório + fila |
| Task 25 | Tasks 15, 23 | precisa do repositório e do módulo `@Global()` existirem |
| Task 27 | Task 24 | e2e precisa da API completa registrada |
| Tasks 28-33 | Task 7 | frontend importa os tipos novos |

**Bloqueio crítico**: esquecer o `exports: [ServiceOrderRepository]`
(Task 10) ou o `exports: [..., TenantRepository]` (Task 12) quebra o
`MaintenanceAlertsModule` na inicialização (Nest não resolve a
dependência). Esquecer de tornar `MaintenanceAlertsModule` `@Global()`
(Task 23) quebra a injeção de `MaintenanceAlertRepository` em
`ServiceOrderManager` (Task 25) com "no provider found" — o oposto do
Gotcha da FIPE (lá o risco era adicionar sem querer; aqui é esquecer).

---

## Gotchas

- **Job sempre usa `prisma.unscoped` com `tenantId` explícito, nunca
  `TenantContextService.run()`** — foi cogitado abrir um contexto de
  tenant por iteração pra reaproveitar os repositórios já escopados
  (`VehicleRepository.listByTenant`, etc.), mas o projeto já tem um
  precedente direto e mais simples pra "fila roda fora do
  AsyncLocalStorage": `AuditLogRepository`. Este plano segue esse
  precedente em vez de inventar um novo padrão — menos código, e evita
  o único caminho (`UNBOUNDED_READS` sem contexto) que a extensão do
  Prisma **lança exceção** de propósito.
- **`MaintenanceAlertsModule` precisa ser `@Global()`** — é o que evita
  o ciclo `ServiceOrdersModule ↔ MaintenanceAlertsModule` (ver seção
  "Decisão de arquitetura" acima). Esquecer isso faz `ServiceOrderManager`
  falhar na injeção de `MaintenanceAlertRepository` com "no provider
  found for MaintenanceAlertRepository", um erro só visível ao subir a
  aplicação (não no `tsc`).
- **`upsertOpenAlert` nunca deve usar `create` puro nem
  `findFirst`-depois-`create`** — só `upsert` no índice único
  `(vehicleId, referenceDate)`, com `update: {}` (no-op). É isso que dá
  idempotência ao job rodando toda noite e preserva um alerta
  `RESOLVED` manualmente até a referência mudar de verdade (Edge Cases
  2 e 3 da spec). Um `findFirst` seguido de `create` teria uma race
  condition teórica entre duas execuções simultâneas do job (não deve
  acontecer com um `jobId` fixo repetível do BullMQ, mas `upsert` é
  atômico de qualquer forma).
- **A resolução automática na transição pra `DELIVERED` acontece na
  mesma transação, não via fila** — diferente do `AuditLogService`
  (fire-and-forget, aceitável porque log não é crítico), aqui a
  consistência entre "status virou `DELIVERED`" e "alerta antigo foi
  resolvido" precisa ser atômica (`TRANSACTIONS.md`). Se isso rodasse
  assíncrono por fila e falhasse, o alerta obsoleto ficaria visível no
  painel até o próximo scan noturno — não é incorreto (o job também
  não recria alerta pra referência já coberta), mas gera uma janela de
  inconsistência sem necessidade.
- **"Link pro cadastro" do cliente na tabela simplificado** — a spec
  (seção UI Changes) pede um link pro cadastro do cliente, mas a tela
  de Clientes não tem rota por id (`/customers/[id]`, diferente de
  `/service-orders/[id]`) — é tudo modal. Este plano linka pra
  `/customers` (lista geral), sem deep-link por id. Se o usuário
  quiser abrir direto o modal do cliente específico, isso é uma
  feature separada na tela de Clientes, fora do escopo deste plano.
- **Sem bootstrap "roda uma vez se a tabela estiver vazia"** —
  diferente do `FipeModule.onModuleInit` (que dispara sync imediato se
  `fipe_brands` estiver vazia, porque a UI de veículo *depende* do
  catálogo populado pra funcionar), aqui o painel funciona
  perfeitamente vazio até o primeiro scan noturno rodar — não há
  necessidade real de popular na hora. Decisão de simplicidade.
- **`monthsSince` usa componentes UTC (`getUTCFullYear`/`getUTCMonth`/
  `getUTCDate`), nunca `getFullYear`/`getMonth` locais** — todo dado
  de data no backend é `Instant`/UTC (`TIMEZONE.md`); usar os métodos
  locais dependeria do fuso horário do processo rodando o worker.

---

## Testing Plan

**Data layer** (via e2e, Task 27): insert/list/resolve idempotente,
filtro por status, ordenação por `referenceDate`, isolamento entre
tenants no `list` e no `resolve`.

**Business logic**:
- `months-since.spec.ts`: 6 meses exatos → devido; 5 meses e 29 dias →
  não devido; virada de ano; dia do mês da referência maior que o dia
  atual (ainda não completou o mês corrente).
- `maintenance-alert-scan.processor.spec.ts`: veículo com última OS
  `DELIVERED` há 7 meses gera alerta; há 3 meses não gera; sem nenhuma
  OS `DELIVERED`, usa `vehicle.createdAt`; erro num veículo não
  interrompe os demais da mesma página; paginação respeita
  `MAX_CHUNKS` sem loop infinito.
- `maintenance-alert.manager.spec.ts`: `monthsOverdue` correto; default
  de status é `OPEN`; `resolve` idempotente; `resolve` de id
  inexistente lança `MAINTENANCE_ALERT_NOT_FOUND`.

**API/integration** (`maintenance-alerts.e2e-spec.ts`, Task 27): ver
Phase 6 — cobre os 2 endpoints, isolamento entre tenants (Edge Case 9),
resolver duas vezes (Edge Case 8) e o fluxo cruzado de auto-resolve na
transição de OS pra `DELIVERED` (Edge Case 4).

**UI tests** (`MaintenanceAlertsTable.test.tsx`, Task 33):
- Estado vazio quando não há alertas `OPEN`.
- Renderiza corretamente marca/modelo/placa, nome do cliente e meses
  devendo.
- Clique em "Marcar como resolvido" chama a mutação e desabilita o
  botão durante `isPending`.

---

## Gate 2 Checklist

**Architecture:**
- [x] Segue Controller → Manager → Repository; Processor chama
      Repository direto (sem Manager no meio), mesmo precedente de
      `AuditLogProcessor`/`FipeSyncProcessor`.
- [x] Cada camada só chama a de baixo; nenhum Controller acessa
      repositório de outro módulo diretamente.
- [x] Ciclo de módulos evitado via `@Global()` + injeção direta, não
      `forwardRef()`/`Provider<T>` (ver seção dedicada acima e Gotchas).
- [x] Componentes nos diretórios corretos (`modules/maintenance-alerts/`,
      `features/maintenance-alerts/`).

**Task Breakdown:**
- [x] Todos os arquivos a alterar estão listados (12 arquivos
      existentes tocados, incluindo 2 módulos que ganham `exports`
      novos).
- [x] Todos os arquivos novos estão listados com localização (14
      arquivos novos).
- [x] Cada task é pequena (1-3 arquivos, um commit).
- [x] Dependências entre tasks estão claras (33 tasks em 7 fases).
- [x] Paralelo vs sequencial marcado.

**Testing:**
- [x] Testes de camada de dados planejados (via e2e — sem
      `MaintenanceAlertRepository.spec.ts` isolado porque toda a lógica
      dele é query direta, coberta com mais valor pelo e2e real contra
      Postgres, mesmo raciocínio já usado nos repositórios das
      Features 3-6).
- [x] Testes de lógica de negócio planejados (`monthsSince`, processor,
      manager).
- [x] Testes de API/integração planejados (`maintenance-alerts.e2e-spec.ts`).
- [x] Testes de UI planejados (`MaintenanceAlertsTable`).
- [x] Edge cases da spec cobertos no plano de teste (9 no total).

Gate 2 passou.
