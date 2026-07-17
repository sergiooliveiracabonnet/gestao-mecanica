# Plan: Ordem de Serviço

**Spec**: .planning/specs/ordem-de-servico.md
**Epic**: nucleo-operacional-mvp
**Created**: 2026-07-17
**Status**: draft

---

## Stack

Full-stack — segue o precedente das Features 3/4: Controller → Manager →
Repository no backend, `features/{domain}/{api,hooks,components}` no
frontend. Diferenças estruturais desta feature:

- **Duas tabelas** (`service_orders` + `service_order_status_history`),
  logo dois repositórios em vez de um.
- **Sem diferenciação de papéis** — todos os 4 roles têm acesso total
  (decisão explícita da spec), primeira feature do epic sem RBAC
  diferenciado.
- **Máquina de estados** — transição de status é um endpoint dedicado
  (`/service-orders/transition`), separado de `update`, porque toda
  mudança de status precisa gravar histórico na mesma transação.
- **Duas dependências cross-módulo** — `VehicleRepository` (Feature 4) e
  `UserRepository` (Feature 2), nenhuma das duas exportada hoje. Ambas
  precisam de `exports: [...]` adicionado ao módulo dono, mesmo padrão
  já usado para `CustomerRepository`.
- **Primeira rota de detalhe no frontend** (`/service-orders/[id]`) —
  até aqui todo CRUD do produto foi lista + modal; OS precisa de uma
  tela própria porque tem histórico, transições de status e edição de
  campos que não cabem bem num modal de criação rápida.

---

## Architecture

### Components

| Component | Type | Purpose |
|---|---|---|
| `ServiceOrderRepository` | Repository | queries Prisma tenant-scoped para `service_orders` (`this.prisma.client`) |
| `ServiceOrderStatusHistoryRepository` | Repository | queries para `service_order_status_history`; sem tenant_id próprio (ver Gotcha) |
| `ServiceOrderManager` | Manager | valida `vehicleId`/`technicianId`, deriva `customerId`, aplica a máquina de estados, orquestra create/update/transition/delete/list/get, audit log |
| `ServiceOrdersController` | Controller | rotas HTTP RPC-style sob `/api/v1`, todos os 4 roles em todo endpoint |
| `ServiceOrdersModule` | Module | wire; importa `VehiclesModule` e `IamModule` pelos repositórios exportados |
| `service-orders-api.ts` | Frontend API client | chama os 6 endpoints |
| `use-service-orders.ts` | Frontend hooks | `useQuery`/`useMutation`, incluindo `useServiceOrder(id)` |
| `ServiceOrdersTable.tsx` | Frontend component | lista com filtro por status, link pra tela de detalhe |
| `ServiceOrderFormModal.tsx` | Frontend component | só criação (seletor de veículo + técnico opcional) |
| `DeleteServiceOrderDialog.tsx` | Frontend component | confirmação de exclusão |
| `StatusBadge.tsx` | Frontend component | badge colorido por status, reusado na tabela e no detalhe |
| `StatusTransitionButtons.tsx` | Frontend component | botões só com os destinos válidos a partir do status atual (espelha a máquina de estados do backend) |
| `StatusHistoryTimeline.tsx` | Frontend component | linha do tempo do histórico |
| `/service-orders` page | Frontend page | lista + modal de criação |
| `/service-orders/[id]` page | Frontend page | detalhe: edição inline + transições + histórico |

### File Locations

**Contratos compartilhados (`packages/contracts/`)**
| File | Location | Purpose |
|---|---|---|
| `service-order.response.ts` | `src/response/` | `ServiceOrderResponse`, `ServiceOrderListItemResponse` (alias), `ServiceOrderStatusHistoryItemResponse`, `SERVICE_ORDER_STATUSES`, `ServiceOrderStatus` |
| `service-order.request.ts` | `src/request/` | `CreateServiceOrderRequest`, `UpdateServiceOrderRequest`, `TransitionServiceOrderRequest`, `DeleteServiceOrderRequest`, `ServiceOrderListRequest` |

**Backend (`backend/src/`)**
| File | Location | Purpose |
|---|---|---|
| `service-order.repository.ts` | `modules/service-orders/repositories/` | CRUD + transição atômica + list tenant-scoped |
| `service-order-status-history.repository.ts` | `modules/service-orders/repositories/` | insert (dentro de tx) + `byServiceOrderId` |
| `service-order.manager.ts` (+ `.spec.ts`) | `modules/service-orders/managers/` | lógica de negócio, máquina de estados |
| `service-order.dto.ts` | `modules/service-orders/dto/` | `class-validator` DTOs |
| `service-orders.controller.ts` | `modules/service-orders/controllers/` | rotas |
| `service-orders.module.ts` | `modules/service-orders/` | wire do módulo |

**Backend (migrations/schema)**
| File | Location | Purpose |
|---|---|---|
| `4_service_orders/migration.sql` | `database/prisma/migrations/` | `CREATE TABLE service_orders` + `service_order_status_history` + índices |

**Frontend (`frontend/`)**
| File | Location | Purpose |
|---|---|---|
| `service-orders-api.ts` | `features/service-orders/api/` | chamadas HTTP |
| `use-service-orders.ts` | `features/service-orders/hooks/` | hooks React Query |
| `ServiceOrdersTable.tsx` (+ `__tests__/`) | `features/service-orders/components/` | tabela |
| `ServiceOrderFormModal.tsx` (+ `__tests__/`) | `features/service-orders/components/` | form de criação |
| `DeleteServiceOrderDialog.tsx` | `features/service-orders/components/` | confirmação de exclusão |
| `StatusBadge.tsx` | `features/service-orders/components/` | badge de status |
| `StatusTransitionButtons.tsx` (+ `__tests__/`) | `features/service-orders/components/` | botões de transição |
| `StatusHistoryTimeline.tsx` | `features/service-orders/components/` | histórico |
| `state-machine.ts` | `features/service-orders/` | cópia da máquina de estados do backend, só pra UI decidir quais botões mostrar |
| `page.tsx` | `app/(dashboard)/service-orders/` | rota `/service-orders` |
| `page.tsx` | `app/(dashboard)/service-orders/[id]/` | rota `/service-orders/[id]` |

### Files to Change

| File | What Changes | Why |
|---|---|---|
| `database/prisma/schema.prisma` | adiciona `model ServiceOrder` e `model ServiceOrderStatusHistory` | novos models; o segundo sem `tenantId` (ver Gotcha) |
| `backend/src/shared/prisma/tenant-isolation.middleware.ts` | adiciona `'ServiceOrder'` a `TENANT_SCOPED_MODELS` — **NÃO** adiciona `'ServiceOrderStatusHistory'` (ver Gotcha) | crítico — mesmo ponto de atenção das Features 3/4; omitir `ServiceOrder` vaza dados cross-tenant |
| `backend/src/shared/errors/app-error-code.ts` | adiciona `SERVICE_ORDER_NOT_FOUND`, `SERVICE_ORDER_VEHICLE_NOT_FOUND`, `SERVICE_ORDER_TECHNICIAN_NOT_FOUND`, `SERVICE_ORDER_INVALID_STATUS_TRANSITION` | erros específicos do domínio |
| `backend/src/app.module.ts` | importa `ServiceOrdersModule` | registra o novo módulo |
| `backend/src/modules/vehicles/vehicles.module.ts` | adiciona `exports: [VehicleRepository]` | `ServiceOrderManager` precisa validar `vehicleId` e ler `vehicle.customerId`; hoje o módulo não exporta nada |
| `backend/src/modules/vehicles/repositories/vehicle.repository.ts` | adiciona `byIds(ids: string[])` | batch lookup pra denormalizar dados do veículo na listagem de OS sem N+1, mesmo padrão de `CustomerRepository.byIds` |
| `backend/src/modules/iam/iam.module.ts` | adiciona `exports: [UserRepository]` | `ServiceOrderManager` precisa validar `technicianId`; hoje o módulo não exporta nada |
| `backend/src/modules/iam/repositories/user.repository.ts` | adiciona `byIds(ids: string[])` | batch lookup pra denormalizar nome do técnico na listagem de OS |
| `packages/contracts/src/index.ts` | exporta `service-order.request`/`service-order.response` | barrel file |
| `frontend/components/dashboard/sidebar.tsx` | move "Ordens de Serviço" de `UPCOMING_ITEMS` pra `NAV_ITEMS`, aponta pra `/service-orders` | último item "em breve" da sidebar — esta feature o ativa |
| `frontend/components/dashboard/topbar.tsx` | adiciona entradas `/service-orders` e `/service-orders/[id]` (dinâmico — ver Gotcha) ao `PAGE_META` | título/descrição da página |

---

## Phases

### Phase 1: Banco de dados

| # | Task | Files |
|---|------|-------|
| 1 | Adicionar `model ServiceOrder` (`customerId`, `vehicleId`, `status`, `checklist Json?`, `diagnosis String?`, `technicianId String?`, `openedAt`, `closedAt DateTime?`, + padrão `id`/`tenantId`/timestamps) e `model ServiceOrderStatusHistory` (`serviceOrderId`, `fromStatus String?`, `toStatus`, `changedBy`, `changedAt`, sem `tenantId`) ao `schema.prisma` | `database/prisma/schema.prisma` |
| 2 | Migration SQL: `CREATE TABLE service_orders` (índices em `tenant_id`, `customer_id`, `vehicle_id`, `status`, `technician_id`) e `CREATE TABLE service_order_status_history` (índice em `service_order_id`) | `database/prisma/migrations/4_service_orders/migration.sql` |

**Sequential**: Task 2 depende da Task 1.

### Phase 2: Contratos compartilhados

| # | Task | Files |
|---|------|-------|
| 3 | Criar `response/service-order.response.ts`: `ServiceOrderStatus` (union type dos 6 estados), `ServiceOrderResponse` (com `statusHistory?: ServiceOrderStatusHistoryItemResponse[]`, populado só em `getById`), `ServiceOrderListItemResponse = ServiceOrderResponse`, `ServiceOrderStatusHistoryItemResponse` | `packages/contracts/src/response/service-order.response.ts` |
| 4 | Criar `request/service-order.request.ts`: `CreateServiceOrderRequest` (`vehicleId`, `technicianId?`, `checklist?`, `diagnosis?`), `UpdateServiceOrderRequest` (`id`, `technicianId?`, `checklist?`, `diagnosis?`), `TransitionServiceOrderRequest` (`id`, `toStatus`), `DeleteServiceOrderRequest`, `ServiceOrderListRequest extends PageableRequest` (`status?`, `vehicleId?`, `technicianId?`) | `packages/contracts/src/request/service-order.request.ts` |
| 5 | Exportar os dois novos arquivos no barrel | `packages/contracts/src/index.ts` |

### Phase 3: Backend — camada de dados

| # | Task | Files |
|---|------|-------|
| 6 | Exportar `VehicleRepository` do `VehiclesModule`; adicionar `byIds(ids)` ao `VehicleRepository` | `modules/vehicles/vehicles.module.ts`, `modules/vehicles/repositories/vehicle.repository.ts` |
| 7 | Exportar `UserRepository` do `IamModule`; adicionar `byIds(ids)` ao `UserRepository` | `modules/iam/iam.module.ts`, `modules/iam/repositories/user.repository.ts` |
| 8 | `ServiceOrderRepository`: `insert` (status inicial `OPEN`), `byId`, `update` (patch `technicianId`/`checklist`/`diagnosis`), `transition(tx, id, fromStatus, toStatus, closedAt?)` — `updateMany` com `where: { id, status: fromStatus, deletedAt: null }` (guarda de corrida atômica, ver Testing Plan), `softDelete`, `listByTenant(offset, limit, status?, vehicleId?, technicianId?)` | `modules/service-orders/repositories/service-order.repository.ts` |
| 9 | `ServiceOrderStatusHistoryRepository`: `insert(tx, input)` (aceita `tx` opcional, mesmo padrão de `UserRepository.insert`), `byServiceOrderId(serviceOrderId)` ordenado por `changedAt asc` | `modules/service-orders/repositories/service-order-status-history.repository.ts` |
| 10 | Adicionar os 4 novos códigos de erro ao enum | `shared/errors/app-error-code.ts` |

**Parallel**: 6, 7, 8, 9, 10 são independentes entre si (arquivos diferentes, sem dependência de import).

### Phase 4: Backend — lógica de negócio

| # | Task | Files |
|---|------|-------|
| 11 | Constante `SERVICE_ORDER_TRANSITIONS: Record<ServiceOrderStatus, ServiceOrderStatus[]>` com a máquina de estados da spec (`OPEN → [IN_PROGRESS, CANCELLED]`, `IN_PROGRESS → [WAITING_PARTS, COMPLETED, CANCELLED]`, `WAITING_PARTS → [IN_PROGRESS, CANCELLED]`, `COMPLETED → [DELIVERED]`, `DELIVERED → []`, `CANCELLED → []`) | `modules/service-orders/managers/service-order-state-machine.ts` |
| 12 | `ServiceOrderManager.create`: valida `vehicleId` via `VehicleRepository.byId` (400 `SERVICE_ORDER_VEHICLE_NOT_FOUND`), deriva `customerId = vehicle.customerId`, valida `technicianId` se informado via `UserRepository.byId` (400 `SERVICE_ORDER_TECHNICIAN_NOT_FOUND`), roda `prisma.transaction`: cria a OS (`status: OPEN`, `openedAt: now`) + insere a primeira linha de histórico (`fromStatus: null`, `toStatus: OPEN`), audit log | `modules/service-orders/managers/service-order.manager.ts` |
| 13 | `ServiceOrderManager.update`: 404 se não achar; valida `technicianId` se informado; NÃO aceita `status`; segue o mesmo fallback null-safe da Feature 4 pro veículo/cliente/técnico ao montar a resposta (nunca lança 500 depois de já ter persistido a mutação) | mesmo arquivo |
| 14 | `ServiceOrderManager.transition`: 404 se não achar; 400 se status atual já é terminal ou a transição não está em `SERVICE_ORDER_TRANSITIONS[status atual]`; `closedAt = now` se `toStatus` é `DELIVERED`/`CANCELLED`; roda `prisma.transaction`: `repository.transition(tx, ...)` — se `count === 0`, lança 409 `SERVICE_ORDER_INVALID_STATUS_TRANSITION` (perdeu a corrida, ver Edge Case 5); senão insere a linha de histórico na mesma tx; audit log | mesmo arquivo |
| 15 | `ServiceOrderManager.delete`, `getById` (popula `statusHistory` via `ServiceOrderStatusHistoryRepository.byServiceOrderId`), `list` (batch fetch `VehicleRepository.byIds`, `CustomerRepository.byIds`, `UserRepository.byIds`, mesmo padrão N+1 da Feature 4) | mesmo arquivo |
| 16 | Testes unitários do `ServiceOrderManager` (mocks manuais dos 4 repositórios + `PrismaService.transaction` + audit log, mesmo padrão de `vehicle.manager.spec.ts`) | `modules/service-orders/managers/service-order.manager.spec.ts` |

**Sequential**: 11 → 14 (transition usa a constante). 12 → 13 → 14 → 15 (mesmo arquivo, métodos incrementais). 15 → 16.

### Phase 5: Backend — API

| # | Task | Files |
|---|------|-------|
| 17 | DTOs: `CreateServiceOrderDto` (`vehicleId` com `@IsUUID('4')`; `technicianId` opcional com `@IsUUID('4')`; `checklist` opcional com `@IsObject()`; `diagnosis` opcional), `UpdateServiceOrderDto` (`id` com `@IsUUID('4')`, sem `status`), `TransitionServiceOrderDto` (`id` com `@IsUUID('4')`; `toStatus` com `@IsIn(SERVICE_ORDER_STATUSES)`), `DeleteServiceOrderDto`, `GetServiceOrderDto`, `ServiceOrderListDto` (`status?` com `@IsIn`, `vehicleId?`/`technicianId?` com `@IsUUID('4')` opcional, `offset`, `limit`) | `modules/service-orders/dto/service-order.dto.ts` |
| 18 | `ServiceOrdersController` sob `@Controller('api/v1')`: `POST service-orders` (create), `POST service-orders/update`, `POST service-orders/transition`, `POST service-orders/delete`, `GET service-order`, `POST service-orders/list` — **todos com `@Roles('ADMIN','MANAGER','FRONT_DESK','MECHANIC')`**, divergência deliberada do padrão das Features 3/4 (spec: "todos os papéis fazem tudo") | `modules/service-orders/controllers/service-orders.controller.ts` |
| 19 | `ServiceOrdersModule` (controllers + providers; `imports: [VehiclesModule, IamModule]` pros repositórios exportados) e registro em `app.module.ts` | `modules/service-orders/service-orders.module.ts`, `app.module.ts` |
| 20 | Adicionar `'ServiceOrder'` a `TENANT_SCOPED_MODELS` — **crítico**. **NÃO** adicionar `'ServiceOrderStatusHistory'` (não tem coluna `tenant_id` — ver Gotcha) | `shared/prisma/tenant-isolation.middleware.ts` |

**Sequential**: 17 → 18 → 19. Task 20 independente, mas bloqueante antes de qualquer teste e2e real.

### Phase 6: Backend — testes e2e

| # | Task | Files |
|---|------|-------|
| 21 | `test/service-orders.e2e-spec.ts`: happy path completo (create → get com histórico → update → transition em sequência pela máquina de estados até `DELIVERED` → list com filtros); todos os 4 papéis têm 200 em todas as rotas (edge case: nenhum 403 esperado, ao contrário de Clientes/Veículos); `vehicleId` inexistente/de outro tenant (400); `technicianId` inexistente/de outro tenant (400); transição inválida — pular etapa e sair de estado terminal (400); `checklist` malformado — array ou string em vez de objeto (400); `customerId` no body de create/update rejeitado (400, `forbidNonWhitelisted`); teste de corrida: duas chamadas concorrentes de `transition` na mesma OS — só uma sucede, a outra recebe 409, sem duplicar histórico; isolamento multi-tenant (OS do tenant A não aparece em get/list/transition/delete do tenant B); soft delete + veículo soft-deletado depois não quebra `getById` (fallback "Veículo removido") | `backend/test/service-orders.e2e-spec.ts` |

### Phase 7: Frontend

| # | Task | Files |
|---|------|-------|
| 22 | `service-orders-api.ts`: 6 métodos (create/update/transition/delete/getById/list) espelhando `vehicles-api.ts` | `features/service-orders/api/service-orders-api.ts` |
| 23 | `state-machine.ts`: mesma constante `SERVICE_ORDER_TRANSITIONS` do backend (duplicada de propósito — é só pra UX, a validação real é sempre server-side) | `features/service-orders/state-machine.ts` |
| 24 | `use-service-orders.ts`: `useServiceOrdersList`, `useServiceOrder(id)`, `useCreateServiceOrder`, `useUpdateServiceOrder`, `useTransitionServiceOrder`, `useDeleteServiceOrder` (invalidação de `service-orders-list` E `['service-order', id]` nas mutations que afetam uma OS específica) | `features/service-orders/hooks/use-service-orders.ts` |
| 25 | `StatusBadge.tsx`: mapa status → cor/label em português (`OPEN` → "Aberta", `IN_PROGRESS` → "Em andamento", `WAITING_PARTS` → "Aguardando peças", `COMPLETED` → "Concluída", `DELIVERED` → "Entregue", `CANCELLED` → "Cancelada") | `features/service-orders/components/StatusBadge.tsx` |
| 26 | `ServiceOrdersTable.tsx`: estados loading/erro/vazio; colunas veículo (marca/modelo/placa)/cliente/técnico/status (`StatusBadge`)/data de abertura; filtro por status; linha clicável leva pra `/service-orders/[id]` | `features/service-orders/components/ServiceOrdersTable.tsx` |
| 27 | `ServiceOrderFormModal.tsx`: seletor de veículo (`useVehiclesList({offset:0, limit:100})`, mesma limitação conhecida da Feature 4), seletor de técnico opcional (`useUsersList({status:'active', offset:0, limit:100})`), campo diagnóstico opcional; checklist fica de fora (edita só na tela de detalhe) | `features/service-orders/components/ServiceOrderFormModal.tsx` |
| 28 | `DeleteServiceOrderDialog.tsx`: mesmo padrão de `DeleteVehicleDialog.tsx` | `features/service-orders/components/DeleteServiceOrderDialog.tsx` |
| 29 | `StatusTransitionButtons.tsx`: lê `SERVICE_ORDER_TRANSITIONS[os.status]`, renderiza um botão por destino válido, chama `useTransitionServiceOrder`; nenhum botão se status é terminal | `features/service-orders/components/StatusTransitionButtons.tsx` |
| 30 | `StatusHistoryTimeline.tsx`: lista `statusHistory` em ordem cronológica, mostra `fromStatus → toStatus`, quem mudou, quando | `features/service-orders/components/StatusHistoryTimeline.tsx` |
| 31 | `app/(dashboard)/service-orders/page.tsx`: monta tabela + modal de criação + filtro de status | `app/(dashboard)/service-orders/page.tsx` |
| 32 | `app/(dashboard)/service-orders/[id]/page.tsx`: `useServiceOrder(id)`; edição inline de diagnóstico/checklist/técnico (reusa `useUpdateServiceOrder`); `StatusTransitionButtons`; `StatusHistoryTimeline`; botão excluir | `app/(dashboard)/service-orders/[id]/page.tsx` |
| 33 | Ativar "Ordens de Serviço" na sidebar (mover de `UPCOMING_ITEMS` pra `NAV_ITEMS`) | `components/dashboard/sidebar.tsx` |
| 34 | Adicionar `/service-orders` ao `PAGE_META` da Topbar; tratar o caso de rota dinâmica `/service-orders/[id]` (ver Gotcha) | `components/dashboard/topbar.tsx` |
| 35 | Testes de componente: `ServiceOrdersTable`, `ServiceOrderFormModal`, `StatusTransitionButtons` (garantir que só os destinos válidos aparecem por status) | `features/service-orders/components/__tests__/*.test.tsx` |

**Sequential**: 22 → 23 → 24 → (25, 26, 27, 28, 29, 30 em paralelo, todos dependem só do hook) → (31, 32 em paralelo — páginas diferentes) → (33, 34 em paralelo, triviais) → 35.

**Gotcha (Topbar em rota dinâmica)**: `PAGE_META` hoje é `Record<pathname, meta>` com match exato (`PAGE_META[pathname]`). Pathname de `/service-orders/[id]` é algo como `/service-orders/abc-123`, que nunca bate uma chave exata. Ajustar a lógica de match da Topbar pra checar `pathname.startsWith('/service-orders/')` como fallback quando não há match exato — primeira vez que isso é necessário no app, mas o fix é pequeno (poucas linhas) e não deve virar uma reescrita do componente.

---

## Parallel vs Sequential

| Parallel Group | Tasks | Why |
|---|---|---|
| Group A | 6, 7, 8, 9, 10 | arquivos independentes, sem import cruzado entre eles |
| Group B | 25, 26, 27, 28, 29, 30 | seis componentes de frontend independentes (dependem só do hook da Task 24) |
| Group C | 31, 32 | páginas diferentes, ambas montam componentes já prontos |
| Group D | 33, 34 | edições triviais em arquivos diferentes da sidebar/topbar já existentes |

| Sequential | Depends On | Why |
|---|---|---|
| Task 2 | Task 1 | migration usa nomes de coluna do schema |
| Task 12-15 | Task 6, 7, 8, 9, 10 | Manager injeta os repositórios e usa os códigos de erro |
| Task 14 | Task 11 | transition usa a constante da máquina de estados |
| Task 16 | Task 15 | testes do Manager completo |
| Task 18 | Task 17 | Controller usa os DTOs |
| Task 19 | Task 18 | Module registra o Controller; importa `VehiclesModule`/`IamModule` |
| Task 21 | Task 19, 20 | e2e precisa da API completa E do isolamento de tenant já ligado |
| Task 24 | Task 22, 23 | hooks chamam o api client e a máquina de estados |
| Task 32 | Task 29, 30 | página de detalhe monta os componentes de transição/histórico |
| Task 35 | Task 26, 27, 29 | testa os componentes já escritos |

**Bloqueio crítico**: Task 20 (`TENANT_SCOPED_MODELS`) e Tasks 6/7 (exportar
`VehicleRepository`/`UserRepository`) são os pontos onde esquecer quebra
silenciosamente — o primeiro vaza dados entre tenants, os outros dois
fazem o `ServiceOrdersModule` falhar ao subir (DI error) só quando o
`ServiceOrderManager` for instanciado, não em tempo de compilação.

---

## Gotchas

- **`ServiceOrderStatusHistory` não tem `tenant_id`** — decisão
  deliberada, seguindo o data model da spec. A tabela só é lida/escrita
  sempre por `service_order_id`, e esse id só chega ao repositório
  depois de passar por um `ServiceOrderRepository.byId()` que já é
  tenant-scoped pela extensão Prisma. Não adicionar
  `'ServiceOrderStatusHistory'` a `TENANT_SCOPED_MODELS` — a extensão
  tentaria injetar `tenant_id` numa tabela que não tem essa coluna e
  quebraria em runtime. Se um reviewer apontar isso como "esqueceu de
  adicionar ao TENANT_SCOPED_MODELS", a resposta é: é proposital, ver
  este parágrafo.
- **Transição de status é atômica via `updateMany` com `status: fromStatus` no WHERE**, não um `findFirst` + `update` em dois passos. Isso é o que resolve o Edge Case 5 (corrida entre duas transições simultâneas) sem precisar de lock explícito — se duas requisições tentam transicionar a mesma OS ao mesmo tempo, só uma delas vê `count === 1`; a outra vê `count === 0` e recebe 409, mesmo que a validação da máquina de estados no Manager (que rodou um instante antes) tenha achado a transição válida com os dados que tinha na hora.
- **Seletor de técnico usa `limit: 100`** — mesma limitação pragmática já aceita na Feature 4 pro seletor de cliente. Não é um problema novo desta feature, só reaparece aqui.
- **`checklist` como JSON livre** — o `@IsObject()` do class-validator rejeita arrays e primitivos, mas não valida estrutura interna nenhuma. Isso é intencional (spec: "livre por agora"), não um buraco de validação esquecido.

---

## Testing Plan

**Business logic** (`service-order.manager.spec.ts`, mocks manuais):
- create: `vehicleId` válido → `customerId` corretamente derivado;
  `vehicleId` inexistente → `SERVICE_ORDER_VEHICLE_NOT_FOUND` (400);
  `technicianId` inexistente → `SERVICE_ORDER_TECHNICIAN_NOT_FOUND`
  (400); sem `technicianId` → sucesso (opcional confirmado); histórico
  inicial gravado com `fromStatus: null`.
- transition: cada transição válida da máquina de estados passa; cada
  transição inválida (pular etapa, sair de terminal) lança
  `SERVICE_ORDER_INVALID_STATUS_TRANSITION` (400); `closedAt` só
  preenchido em `DELIVERED`/`CANCELLED`; `repository.transition`
  retornando `count: 0` (corrida perdida) lança o mesmo erro como 409.
- update: OS inexistente → `SERVICE_ORDER_NOT_FOUND` (404); `status` não
  é um parâmetro aceito pelo método (rejeição real acontece no DTO,
  coberto no e2e).
- delete: soft delete em qualquer status (incluindo terminal) funciona;
  corrida concorrente (count 0) → 404.
- list: filtros por `status`/`vehicleId`/`technicianId` isolados e
  combinados.

**API/integration** (`test/service-orders.e2e-spec.ts`): ver Phase 6,
Task 21 — cobre todos os 8 edge cases da spec, incluindo o teste de
corrida em transições concorrentes.

**UI tests** (`ServiceOrdersTable.test.tsx`,
`ServiceOrderFormModal.test.tsx`, `StatusTransitionButtons.test.tsx`):
- Tabela: renderiza loading/erro/vazio/lista; filtro de status funciona.
- Form: seletor de veículo obrigatório; seletor de técnico opcional.
- `StatusTransitionButtons`: pra cada um dos 6 status, renderiza
  exatamente os botões esperados pela máquina de estados (`DELIVERED`
  e `CANCELLED` não renderizam nenhum botão).

---

## Gate 2 Checklist

**Architecture:**
- [x] Segue Controller → Manager → Repository (backend) e `api/hooks/
      components` (frontend), padrão idêntico às Features 2-4.
- [x] Cada camada só chama a de baixo. `ServiceOrderManager` chama
      `VehicleRepository`/`UserRepository`/`CustomerRepository`
      (repositórios de outros módulos, exportados explicitamente) —
      mesmo nível de acoplamento já aceito na Feature 4.
- [x] Componentes nos diretórios corretos (`modules/service-orders/`,
      `features/service-orders/`).

**Task Breakdown:**
- [x] Todos os arquivos a alterar estão listados.
- [x] Todos os arquivos novos estão listados com localização.
- [x] Cada task é pequena (1-3 arquivos, um commit).
- [x] Dependências entre tasks estão claras.
- [x] Paralelo vs sequencial marcado.

**Testing:**
- [x] Testes de camada de dados planejados (via e2e).
- [x] Testes de lógica de negócio planejados
      (`service-order.manager.spec.ts`), incluindo a máquina de estados
      completa e o caso de corrida.
- [x] Testes de API/integração planejados
      (`service-orders.e2e-spec.ts`).
- [x] Testes de UI planejados (tabela, form, botões de transição).
- [x] Edge cases da spec cobertos no plano de teste (todos os 8
      mapeados, incluindo o teste de corrida do Edge Case 5).

Gate 2 passou.
