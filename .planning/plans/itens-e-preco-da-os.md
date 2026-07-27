# Plan: Itens e Preço da OS

**Spec**: .planning/specs/itens-e-preco-da-os.md
**Epic**: modulo-financeiro-relatorios (Feature 8)
**Created**: 2026-07-27
**Status**: draft

---

## Stack

Full-stack. Módulo novo (`service-order-items`) dentro do domínio de
`service-orders` já existente — sem módulo NestJS próprio, os componentes
novos vivem em `backend/src/modules/service-orders/` (repository, DTOs,
métodos no manager/controller existentes), mesmo padrão de
`ServiceOrderStatusHistoryRepository`.

---

## Decisão de arquitetura: sem tenant_id na tabela de itens

`service_order_items` segue exatamente o mesmo precedente de
`service_order_status_history`: sem `tenant_id`, porque todo acesso passa
primeiro por `ServiceOrderRepository.byId()` (tenant-scoped) antes de
qualquer leitura/escrita de item. Não entra em `TENANT_SCOPED_MODELS`.

## Decisão: total nunca é armazenado

`totalAmountCents` da OS é sempre calculado a partir da soma dos itens não
removidos — nunca um campo denormalizado em `service_orders`. Evita
qualquer risco de dessincronia entre o campo e o que os itens realmente
somam (ver Edge Case 4 da spec: sem lock otimista, então dois updates
concorrentes já são um risco conhecido — um total denormalizado só
adicionaria uma segunda fonte de verdade pra dessincronizar).

---

## Architecture

### Components

| Component | Type | Purpose |
|---|---|---|
| `ServiceOrderItemRepository` | Repository | CRUD de itens + `sumTotalsByServiceOrderIds` (agregação em lote pro `list`) |
| `ServiceOrderManager` (estendido) | Manager | ganha `addItem`, `updateItem`, `deleteItem`; `getById`/`list`/`toResponse` passam a incluir `totalAmountCents`/`items` |
| `ServiceOrdersController` (estendido) | Controller | 3 rotas novas, `@Roles('ADMIN','MANAGER','FRONT_DESK')` — sem `MECHANIC` |
| `formatCurrencyBRL` | Util puro | formata centavos como "R$ 1.234,56" |
| `serviceOrderItemsApi` | Frontend API client | chama os 3 endpoints novos |
| `use-service-order-items.ts` | Frontend hooks | `useAddServiceOrderItem`, `useUpdateServiceOrderItem`, `useDeleteServiceOrderItem` |
| `ServiceOrderItemsSection.tsx` | Frontend component | tabela de itens + form de adicionar + total em destaque |

### File Locations

**Contratos (`packages/contracts/`)**
| File | Location | Purpose |
|---|---|---|
| `service-order-item.response.ts` | `src/response/` | `SERVICE_ORDER_ITEM_TYPES`, `ServiceOrderItemType`, `ServiceOrderItemResponse` |
| `service-order-item.request.ts` | `src/request/` | `CreateServiceOrderItemRequest`, `UpdateServiceOrderItemRequest`, `DeleteServiceOrderItemRequest` |

**Backend (`backend/src/modules/service-orders/`)**
| File | Location | Purpose |
|---|---|---|
| `service-order-item.repository.ts` (+ novo) | `repositories/` | acesso a `service_order_items` |
| `service-order-item.dto.ts` (+ novo) | `dto/` | `CreateServiceOrderItemDto`, `UpdateServiceOrderItemDto`, `DeleteServiceOrderItemDto` |

**Backend (migrations/schema)**
| File | Location | Purpose |
|---|---|---|
| `8_service_order_items/migration.sql` | `database/prisma/migrations/` | `CREATE TABLE service_order_items` + índice |

**Backend (testes)**
| File | Location | Purpose |
|---|---|---|
| `service-order-items.e2e-spec.ts` | `backend/test/` | endpoints + isolamento + validação |

**Frontend (`frontend/`)**
| File | Location | Purpose |
|---|---|---|
| `format-currency.ts` (+ teste) | `lib/` | `formatCurrencyBRL(cents)` |
| `service-order-items-api.ts` | `features/service-orders/api/` | chamadas HTTP |
| `use-service-order-items.ts` | `features/service-orders/hooks/` | hooks React Query |
| `ServiceOrderItemsSection.tsx` (+ teste) | `features/service-orders/components/` | tabela + adicionar/editar/remover + total |

### Files to Change

| File | What Changes | Why |
|---|---|---|
| `database/prisma/schema.prisma` | adiciona `model ServiceOrderItem` | nova tabela, sem `tenantId` |
| `packages/contracts/src/response/service-order.response.ts` | `ServiceOrderResponse` ganha `totalAmountCents: number`, `items?: ServiceOrderItemResponse[]` | expõe valor/itens no response existente |
| `packages/contracts/src/index.ts` | exporta os 2 arquivos novos | barrel |
| `backend/src/shared/errors/app-error-code.ts` | adiciona `SERVICE_ORDER_ITEM_NOT_FOUND` | erro do `update`/`delete` com id inexistente/outro tenant |
| `backend/src/modules/service-orders/managers/service-order.manager.ts` | `addItem`/`updateItem`/`deleteItem`; `toResponse` recebe itens + calcula `totalAmountCents`; `getById` busca itens da OS; `list` busca totais em lote via `sumTotalsByServiceOrderIds` | regra de negócio central da feature |
| `backend/src/modules/service-orders/managers/service-order.manager.spec.ts` | novos testes pros 3 métodos + `toResponse`/`list`/`getById` com itens | cobertura |
| `backend/src/modules/service-orders/controllers/service-orders.controller.ts` | 3 rotas novas | expõe a API |
| `frontend/app/(dashboard)/service-orders/[id]/page.tsx` | adiciona `<ServiceOrderItemsSection>` | integra a UI nova na página existente |
| `frontend/features/service-orders/components/ServiceOrdersTable.tsx` | nova coluna "Valor" (`totalAmountCents` formatado) | spec: UI Changes |
| `frontend/features/service-orders/components/__tests__/ServiceOrdersTable.test.tsx` | ajusta fixture/asserts pra nova coluna | mantém teste passando |

---

## Phases

### Phase 1: Banco de dados

| # | Task | Files |
|---|------|-------|
| 1 | `model ServiceOrderItem` (`serviceOrderId`, `type` TEXT, `description` TEXT, `quantity` `Decimal @db.Decimal(10,2)`, `unitPriceCents` Int, `createdAt`/`updatedAt`/`deletedAt`; índice `@@index([serviceOrderId])`; **sem** `tenantId`) | `database/prisma/schema.prisma` |
| 2 | Migration SQL: `CREATE TABLE service_order_items` + índice | `database/prisma/migrations/8_service_order_items/migration.sql` |

**Sequential**: 1 → 2.

### Phase 2: Contratos compartilhados

| # | Task | Files |
|---|------|-------|
| 3 | `SERVICE_ORDER_ITEM_TYPES = ['PART', 'LABOR']`, `ServiceOrderItemType`, `ServiceOrderItemResponse` (`id, serviceOrderId, type, description, quantity, unitPriceCents, lineTotalCents, createdAt`) | `packages/contracts/src/response/service-order-item.response.ts` |
| 4 | `CreateServiceOrderItemRequest { serviceOrderId, type, description, quantity, unitPriceCents }`, `UpdateServiceOrderItemRequest { id, description?, quantity?, unitPriceCents?, type? }`, `DeleteServiceOrderItemRequest { id }` | `packages/contracts/src/request/service-order-item.request.ts` |
| 5 | `ServiceOrderResponse` ganha `totalAmountCents: number` e `items?: ServiceOrderItemResponse[]` | `packages/contracts/src/response/service-order.response.ts` |
| 6 | Exportar os 2 arquivos novos no barrel | `packages/contracts/src/index.ts` |
| 7 | `pnpm --filter @oficina/contracts run build` | — |

**Sequential**: 3, 4 → 5 → 6 → 7.

### Phase 3: Backend — repositório de itens

| # | Task | Files |
|---|------|-------|
| 8 | `ServiceOrderItemRepository`: `insert(input, tx?)`, `update(id, patch)` (`updateMany where deletedAt IS NULL`), `softDelete(id)`, `byId(id)`, `byServiceOrderId(serviceOrderId)` (`where deletedAt IS NULL, orderBy createdAt asc`), `sumTotalsByServiceOrderIds(ids)` — usa `groupBy` com `_sum` sobre `quantity * unitPriceCents` calculado em memória por linha (Prisma não faz `SUM(qty*price)` direto em `groupBy`, então: busca todas as linhas não removidas dos ids pedidos com `select { serviceOrderId, quantity, unitPriceCents }` e soma em JS por `serviceOrderId` — volume por OS é pequeno, sem problema de performance) | `backend/src/modules/service-orders/repositories/service-order-item.repository.ts` |

**Sequential**: depende de 1 (schema).

### Phase 4: Backend — regra de negócio e API

| # | Task | Files |
|---|------|-------|
| 9 | `SERVICE_ORDER_ITEM_NOT_FOUND` no enum | `backend/src/shared/errors/app-error-code.ts` |
| 10 | `ServiceOrderManager.addItem(request)`: busca OS por `serviceOrderId` (404 se não achar — cobre isolamento entre tenants), valida `quantity > 0` e `unitPriceCents >= 0` (Nest já valida via DTO, mas o manager não confia cegamente — ver KOTLIN.md-equivalente: validação na borda), insere item, retorna `{ item }` já com `lineTotalCents` calculado | `backend/src/modules/service-orders/managers/service-order.manager.ts` |
| 11 | `ServiceOrderManager.updateItem(request)`: busca item por id (404 se não achar), aplica patch, retorna `{ item }` | idem |
| 12 | `ServiceOrderManager.deleteItem(id)`: busca item (404), soft delete, retorna `{ item }` (com `deletedAt` implícito — resposta reflete o estado antes da remoção, mesmo padrão de `VehicleManager.delete`) | idem |
| 13 | `getById`: busca `ServiceOrderItemRepository.byServiceOrderId` em paralelo com vehicle/technician/history; `toResponse` ganha parâmetro `items?` e calcula `totalAmountCents` a partir deles (`0` se vazio) | idem |
| 14 | `list`: depois de montar `items` (as OS da página), busca `sumTotalsByServiceOrderIds` com os ids da página; `toResponse` recebe o total já calculado (sem carregar `items` completo no `list`, só o número) | idem |
| 15 | `CreateServiceOrderItemDto` (`@IsUUID` serviceOrderId, `@IsIn(SERVICE_ORDER_ITEM_TYPES)` type, `@IsNotEmpty` description, `@IsNumber() @Min(0.01)` quantity, `@IsInt() @Min(0)` unitPriceCents), `UpdateServiceOrderItemDto` (`id` obrigatório, demais campos opcionais com as mesmas regras), `DeleteServiceOrderItemDto` (`id`) | `backend/src/modules/service-orders/dto/service-order-item.dto.ts` |
| 16 | Controller: `@Roles('ADMIN','MANAGER','FRONT_DESK')` (sem `MECHANIC` — diferente do `ALL_ROLES` usado no resto deste controller, decisão explícita da spec) em `POST service-orders/items`, `POST service-orders/items/update`, `POST service-orders/items/delete` | `backend/src/modules/service-orders/controllers/service-orders.controller.ts` |
| 17 | Testes unitários do manager: `addItem` happy path + OS inexistente (404); `updateItem` happy path + item inexistente (404); `deleteItem` happy path + soft-delete zera do total; `getById` inclui `items` e `totalAmountCents` corretos; `list` agrega `totalAmountCents` em lote sem carregar `items`; OS sem itens → `totalAmountCents: 0`, `items: []` | `backend/src/modules/service-orders/managers/service-order.manager.spec.ts` |

**Sequential**: 10-14 dependem de 8, 9, 7 (contratos). 15 depende de 7. 16 depende de 10-15. 17 depende de 10-14.

### Phase 5: Backend — testes e2e

| # | Task | Files |
|---|------|-------|
| 18 | `service-order-items.e2e-spec.ts`: cria OS → adiciona item `PART` e item `LABOR` → `GET /service-order` retorna `total_amount_cents` correto e `items` com os 2; edita quantidade/preço de um item → total recalculado; remove um item → total recalculado, item some de `items`; `POST /service-orders/list` retorna `total_amount_cents` sem `items`; item de outra OS/tenant no `update`/`delete` → 404 (Edge Case 3/5); quantidade zero/negativa e `unit_price_cents` negativo → 400 (Edge Case 1); `MECHANIC` recebe 403 nos 3 endpoints novos; item pode ser adicionado/editado/removido com a OS em `DELIVERED` e `CANCELLED` (sem trava, Edge Case da spec) | `backend/test/service-order-items.e2e-spec.ts` |

**Sequential**: depende de 16 (API completa).

### Phase 6: Frontend

| # | Task | Files |
|---|------|-------|
| 19 | `formatCurrencyBRL(cents: number): string` — `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)`; teste: `0` → "R$ 0,00", valor negativo, valor grande | `frontend/lib/format-currency.ts` (+ `__tests__/format-currency.test.ts`) |
| 20 | `serviceOrderItemsApi`: `create(request)`, `update(request)`, `delete(request)` — mesmo padrão `keysToSnake`/`keysToCamel` implícito via `apiClient` | `frontend/features/service-orders/api/service-order-items-api.ts` |
| 21 | `use-service-order-items.ts`: `useAddServiceOrderItem()`, `useUpdateServiceOrderItem()`, `useDeleteServiceOrderItem()` — todas invalidam `['service-order', serviceOrderId]` no `onSuccess` (mesma query key de `useServiceOrder`, já usada por `useUpdateServiceOrder`) | `frontend/features/service-orders/hooks/use-service-order-items.ts` |
| 22 | `ServiceOrderItemsSection.tsx`: recebe `serviceOrder` (com `items`/`totalAmountCents`); tabela (tipo, descrição, quantidade, valor unitário, valor da linha); form inline "Adicionar item" (`Select` PEÇA/MÃO DE OBRA, `Input` descrição/quantidade/valor); botão remover por linha (com confirmação leve, mesmo padrão de `DeleteServiceOrderDialog`); total em destaque via `formatCurrencyBRL(totalAmountCents)`; estado vazio "Nenhum item lançado ainda" | `frontend/features/service-orders/components/ServiceOrderItemsSection.tsx` |
| 23 | Testes de componente: renderiza itens existentes; adicionar item chama `useAddServiceOrderItem` e limpa o form; remover item chama `useDeleteServiceOrderItem`; total exibido bate com `totalAmountCents`; estado vazio quando `items` é `[]` | `frontend/features/service-orders/components/__tests__/ServiceOrderItemsSection.test.tsx` |
| 24 | Integra `<ServiceOrderItemsSection serviceOrder={serviceOrder} />` na página de detalhe, entre o Diagnóstico e o Histórico da OS | `frontend/app/(dashboard)/service-orders/[id]/page.tsx` |
| 25 | `ServiceOrdersTable.tsx`: nova coluna "Valor" com `formatCurrencyBRL(item.totalAmountCents)` | `frontend/features/service-orders/components/ServiceOrdersTable.tsx` |
| 26 | Ajusta fixture/asserts do teste existente pra incluir `totalAmountCents` e a coluna nova | `frontend/features/service-orders/components/__tests__/ServiceOrdersTable.test.tsx` |

**Sequential**: 19 independente. 20 depende de 7 (contratos). 21 depende de 20. 22 depende de 19, 21. 23 depende de 22. 24 depende de 22. 25-26 dependem de 7, 19.

---

## Parallel vs Sequential

| Parallel Group | Tasks | Why |
|---|---|---|
| Group A | 3, 4 | arquivos de contrato independentes |
| Group B | 19, (20 após 7) | util de formatação não depende de contratos |

| Sequential | Depends On | Why |
|---|---|---|
| Task 2 | Task 1 | migration usa nomes de coluna do schema |
| Task 7 | Tasks 3, 4, 5, 6 | rebuild do pacote depois de editar contratos |
| Tasks 8-26 | Task 7 | backend e frontend importam os tipos novos de `@oficina/contracts` |
| Task 16 | Tasks 10-15 | controller expõe os métodos do manager + valida via DTO |
| Task 18 | Task 16 | e2e precisa da API completa registrada |
| Task 24 | Task 22 | página integra o componente já pronto |

**Bloqueio crítico**: esquecer de excluir `MECHANIC` do `@Roles(...)` das 3 rotas novas (Task 16) quebraria a spec (Requirements: "Acesso restrito a ADMIN, MANAGER, FRONT_DESK") sem quebrar nenhum teste do resto do controller (que usa `ALL_ROLES`) — só o e2e novo (Task 18) pega isso.

---

## Gotchas

- **`quantity` é `Decimal`, não `Int`** — a spec pede suporte a quantidade
  fracionária (ex: 1.5 litro de óleo). Usar `@db.Decimal(10,2)` no Prisma
  schema, e no TypeScript tratar como `number` na camada de request/response
  (Prisma retorna `Decimal` do `decimal.js`, então o manager precisa
  converter explicitamente com `.toNumber()` ao montar o Response — mesmo
  cuidado se algum dia aparecer outro campo `Decimal` no projeto, é a
  primeira vez que este schema usa esse tipo).
- **Sem `tenantId` em `service_order_items`, mesmo padrão de
  `service_order_status_history`** — todo lookup de item por id precisa
  confirmar que a OS dona pertence ao tenant do usuário (via
  `ServiceOrderRepository.byId()`, que já é tenant-scoped) antes de
  qualquer operação de escrita — nunca confiar só no `id` do item.
- **`sumTotalsByServiceOrderIds` soma em JS, não em SQL** — decisão
  deliberada (ver Task 8): Prisma `groupBy` não expressa `SUM(qty * price)`
  diretamente sem um raw query. Como o volume de itens por OS é pequeno
  (poucas dezenas no máximo), buscar as linhas cruas e somar em memória é
  mais simples e não tem custo de performance real. Se o volume crescer
  muito no futuro, revisar pra um `$queryRaw`.
- **`lineTotalCents` nunca é persistido** — é sempre `quantity *
  unitPriceCents` calculado no momento de montar o `ServiceOrderItemResponse`,
  tanto no manager quanto em qualquer lugar que precisar dele. Evita a
  mesma classe de bug de dessincronia do `totalAmountCents` da OS.
- **Sem trava de edição por status** — decisão explícita da spec (Edge
  Cases). O e2e (Task 18) testa explicitamente que itens podem ser
  adicionados/editados/removidos com a OS em `DELIVERED` e `CANCELLED`,
  justamente pra documentar essa decisão como comportamento esperado, não
  como bug.

---

## Testing Plan

**Data layer**: sem `ServiceOrderItemRepository.spec.ts` isolado — toda a
lógica dele é query direta, coberta com mais valor pelo e2e real contra
Postgres (Task 18), mesmo raciocínio já usado nos repositórios das Features
3-7 (`ServiceOrderStatusHistoryRepository` também não tem spec isolado).

**Business logic** (`service-order.manager.spec.ts`, Task 17): `addItem`/
`updateItem`/`deleteItem` happy path e 404; `getById`/`list` com itens
(inclui `totalAmountCents` correto, `list` não carrega `items` completo);
OS sem itens.

**API/integration** (`service-order-items.e2e-spec.ts`, Task 18): ver Phase
5 — cobre os 3 endpoints, validação de quantidade/valor, isolamento entre
tenants, bloqueio de `MECHANIC`, e ausência de trava por status.

**UI tests** (`ServiceOrderItemsSection.test.tsx`, Task 23):
- Renderiza itens existentes com valores formatados corretamente.
- Adicionar item chama a mutação e limpa o formulário.
- Remover item chama a mutação de delete.
- Total exibido bate com `totalAmountCents` recebido.
- Estado vazio quando não há itens.

`format-currency.test.ts` (Task 19): `0` centavos, valor negativo (não deve
acontecer na prática, mas a função não deve quebrar), valores grandes
(formatação de milhar).

---

## Gate 2 Checklist

**Architecture:**
- [x] Segue Controller → Manager → Repository; sem módulo NestJS novo (itens
      vivem dentro de `service-orders`, mesmo domínio).
- [x] Cada camada só chama a de baixo.
- [x] Sem tenant_id na tabela de itens, seguindo o precedente já
      estabelecido (`service_order_status_history`), com justificativa
      documentada.
- [x] Componentes nos diretórios corretos.

**Task Breakdown:**
- [x] Todos os arquivos a alterar estão listados (8 arquivos existentes
      tocados).
- [x] Todos os arquivos novos estão listados com localização (9 arquivos
      novos, incluindo testes).
- [x] Cada task é pequena (1-3 arquivos).
- [x] Dependências entre tasks estão claras (26 tasks em 6 fases).
- [x] Paralelo vs sequencial marcado.

**Testing:**
- [x] Testes de camada de dados planejados (via e2e, com justificativa
      explícita de por que não há spec isolado de repositório).
- [x] Testes de lógica de negócio planejados (manager).
- [x] Testes de API/integração planejados (e2e).
- [x] Testes de UI planejados (`ServiceOrderItemsSection`,
      `format-currency`).
- [x] Edge cases da spec cobertos no plano de teste (7 no total: validação,
      remoção total, isolamento, concorrência documentada como aceita,
      isolamento no update/delete, arredondamento de quantidade, OS sem
      itens).

Gate 2 passou.
