# Plan: Veículos (CRUD vinculado a Cliente)

**Spec**: .planning/specs/veiculos-crud-vinculado-cliente.md
**Epic**: nucleo-operacional-mvp
**Created**: 2026-07-16
**Status**: draft

---

## Stack

Full-stack — segue exatamente o precedente da Feature 3 (Clientes):
Controller → Manager → Repository no backend, `features/{domain}/{api,
hooks,components}` no frontend. Diferenças estruturais desta feature:
`vehicles` referencia `customers` (validação de existência, não FK
física) e o formulário de criação precisa de um seletor de cliente.

---

## Architecture

### Components

| Component | Type | Purpose |
|---|---|---|
| `VehicleRepository` | Repository | queries Prisma tenant-scoped (`this.prisma.client`) para `vehicles` |
| `VehicleManager` | Manager | valida `customerId` (existe no tenant?), valida placa única por tenant, orquestra create/update/delete/list/get, audit log |
| `VehiclesController` | Controller | rotas HTTP RPC-style sob `/api/v1` |
| `VehiclesModule` | Module | wire do controller/manager/repository; importa `CustomerRepository` do `CustomersModule` (ver Files to Change) |
| `vehicles-api.ts` | Frontend API client | chama os 5 endpoints |
| `use-vehicles.ts` | Frontend hooks | `useQuery`/`useMutation` |
| `VehiclesTable.tsx` | Frontend component | lista com estados loading/erro/vazio, coluna "Cliente" |
| `VehicleFormModal.tsx` | Frontend component | cria E edita; seletor de cliente só aparece na criação |
| `DeleteVehicleDialog.tsx` | Frontend component | confirmação de exclusão com aviso |
| `/vehicles` page | Frontend page | monta os componentes acima dentro do shell de dashboard |

### File Locations

**Contratos compartilhados (`packages/contracts/`)**
| File | Location | Purpose |
|---|---|---|
| `vehicle.response.ts` | `src/response/` | `VehicleResponse`, `VehicleListItemResponse` |
| `vehicle.request.ts` | `src/request/` | `CreateVehicleRequest`, `UpdateVehicleRequest`, `DeleteVehicleRequest`, `VehicleListRequest` |

**Backend (`backend/src/`)**
| File | Location | Purpose |
|---|---|---|
| `vehicle.repository.ts` | `modules/vehicles/repositories/` | CRUD + list tenant-scoped |
| `vehicle.manager.ts` (+ `.spec.ts`) | `modules/vehicles/managers/` | lógica de negócio, valida `customerId` via `CustomerRepository` |
| `vehicle.dto.ts` | `modules/vehicles/dto/` | `class-validator` DTOs |
| `vehicles.controller.ts` | `modules/vehicles/controllers/` | rotas |
| `vehicles.module.ts` | `modules/vehicles/` | wire do módulo |

**Backend (migrations/schema)**
| File | Location | Purpose |
|---|---|---|
| `3_vehicles/migration.sql` | `database/prisma/migrations/` | `CREATE TABLE vehicles` + índices |

**Frontend (`frontend/`)**
| File | Location | Purpose |
|---|---|---|
| `vehicles-api.ts` | `features/vehicles/api/` | chamadas HTTP |
| `use-vehicles.ts` | `features/vehicles/hooks/` | hooks React Query |
| `VehiclesTable.tsx` (+ `__tests__/`) | `features/vehicles/components/` | tabela |
| `VehicleFormModal.tsx` (+ `__tests__/`) | `features/vehicles/components/` | form criar/editar + seletor de cliente |
| `DeleteVehicleDialog.tsx` | `features/vehicles/components/` | confirmação de exclusão |
| `page.tsx` | `app/(dashboard)/vehicles/` | rota `/vehicles` |

### Files to Change

| File | What Changes | Why |
|---|---|---|
| `database/prisma/schema.prisma` | adiciona `model Vehicle` | novo model tenant-scoped, com `photos String[]` (primeiro array nativo do schema) |
| `backend/src/shared/prisma/tenant-isolation.middleware.ts` | adiciona `'Vehicle'` a `TENANT_SCOPED_MODELS` | crítico — mesmo ponto de atenção documentado na Feature 3; sem isso, vazamento cross-tenant |
| `backend/src/shared/errors/app-error-code.ts` | adiciona `VEHICLE_PLATE_ALREADY_EXISTS`, `VEHICLE_NOT_FOUND`, `VEHICLE_CUSTOMER_NOT_FOUND` | erros específicos do domínio |
| `backend/src/app.module.ts` | importa `VehiclesModule` | registra o novo módulo |
| `backend/src/modules/customers/customers.module.ts` | adiciona `exports: [CustomerRepository]` | `VehicleManager` precisa validar `customerId` contra `CustomerRepository.byId` — hoje o módulo não exporta nada |
| `packages/contracts/src/index.ts` | exporta `vehicle.request`/`vehicle.response` | barrel file |
| `frontend/components/dashboard/sidebar.tsx` | move "Veículos" de `UPCOMING_ITEMS` pra `NAV_ITEMS`, aponta pra `/vehicles` | a sidebar já tem o item desenhado como "em breve" — esta feature o ativa |

---

## Phases

### Phase 1: Banco de dados

| # | Task | Files |
|---|------|-------|
| 1 | Adicionar `model Vehicle` ao `schema.prisma` (campos da spec: `customerId`, `brand`, `model`, `plate`, `year?`, `engine?`, `fuelType?`, `chassis?`, `mileage?`, `photos String[]`, + padrão `id`/`tenantId`/timestamps) | `database/prisma/schema.prisma` |
| 2 | Migration SQL: `CREATE TABLE vehicles`, índices em `tenant_id` e `customer_id`, índice único parcial composto `(tenant_id, plate) WHERE deleted_at IS NULL` | `database/prisma/migrations/3_vehicles/migration.sql` |

**Sequential**: Task 2 depende da Task 1.

### Phase 2: Contratos compartilhados

| # | Task | Files |
|---|------|-------|
| 3 | Criar `response/vehicle.response.ts` (`VehicleResponse`, `VehicleListItemResponse`) e `request/vehicle.request.ts` (`CreateVehicleRequest`, `UpdateVehicleRequest`, `DeleteVehicleRequest`, `VehicleListRequest extends PageableRequest` com `search?`/`customerId?`) | `packages/contracts/src/response/vehicle.response.ts`, `packages/contracts/src/request/vehicle.request.ts` |
| 4 | Exportar os dois novos arquivos no barrel | `packages/contracts/src/index.ts` |

### Phase 3: Backend — camada de dados e negócio

| # | Task | Files |
|---|------|-------|
| 5 | Exportar `CustomerRepository` do `CustomersModule` | `modules/customers/customers.module.ts` |
| 6 | `VehicleRepository`: `insert`, `update`, `softDelete`, `byId`, `byPlate` (unicidade), `listByTenant(offset, limit, search?, customerId?)` — todos via `this.prisma.client` | `modules/vehicles/repositories/vehicle.repository.ts` |
| 7 | Adicionar `VEHICLE_PLATE_ALREADY_EXISTS`, `VEHICLE_NOT_FOUND`, `VEHICLE_CUSTOMER_NOT_FOUND` ao enum de erros | `shared/errors/app-error-code.ts` |
| 8 | `VehicleManager`: `create` (valida `customerId` via `CustomerRepository.byId` — 400 se não achar/outro tenant; valida placa única — 409, com catch de P2002 pro caso de corrida, mesmo padrão da Feature 3), `update` (404 se não achar; `customerId` não é aceito no DTO), `delete` (soft delete, 404 se corrida concorrente), `getById` (404), `list` (com `search`/`customerId`) | `modules/vehicles/managers/vehicle.manager.ts` |
| 9 | Testes unitários do `VehicleManager` (mocks manuais de `VehicleRepository`/`CustomerRepository`/audit log, mesmo padrão de `customer.manager.spec.ts`) | `modules/vehicles/managers/vehicle.manager.spec.ts` |

**Sequential**: 5 → 8 (Manager injeta `CustomerRepository`). 6 → 8 (Manager depende do Repository). 8 → 9. Task 7 é independente.

### Phase 4: Backend — API

| # | Task | Files |
|---|------|-------|
| 10 | DTOs `class-validator`: `CreateVehicleDto` (`customerId`/`brand`/`model`/`plate` obrigatórios com `@IsUUID('4')` no `customerId`; resto opcional), `UpdateVehicleDto` (`id` com `@IsUUID('4')`, sem `customerId`), `DeleteVehicleDto`, `GetVehicleDto` (`id` com `@IsUUID('4')`), `VehicleListDto` (`search?`, `customerId?` com `@IsUUID('4')` opcional, `offset`, `limit`) | `modules/vehicles/dto/vehicle.dto.ts` |
| 11 | `VehiclesController` sob `@Controller('api/v1')`: `POST vehicles` (create), `POST vehicles/update`, `POST vehicles/delete` (`@Roles('ADMIN','MANAGER','FRONT_DESK')`), `GET vehicle`, `POST vehicles/list` (todos os 4 papéis) | `modules/vehicles/controllers/vehicles.controller.ts` |
| 12 | `VehiclesModule` (controllers + providers; importa `CustomersModule` pra ter acesso ao `CustomerRepository` exportado) e registro em `app.module.ts` | `modules/vehicles/vehicles.module.ts`, `app.module.ts` |
| 13 | Adicionar `'Vehicle'` a `TENANT_SCOPED_MODELS` — **crítico**, mesmo aviso da Feature 3 | `shared/prisma/tenant-isolation.middleware.ts` |

**Sequential**: 10 → 11 → 12. Task 13 independente, mas bloqueante antes de qualquer teste e2e real.

### Phase 5: Backend — testes e2e

| # | Task | Files |
|---|------|-------|
| 14 | `test/vehicles.e2e-spec.ts`: happy path (create/update/delete/get/list, incluindo filtro por `customerId`), papéis (`MECHANIC` 403 em create/update/delete, 200 em get/list), placa duplicada no mesmo tenant (409), `customerId` inexistente/de outro tenant (400), mesma placa em dois tenants (ambos 201), `customerId` no body de update rejeitado (400), isolamento multi-tenant (veículo do tenant A não aparece pro tenant B), soft-delete + recriação com mesma placa — usar `configureApp()`, `generateValidCpf()` (pro cliente-pai) já existentes | `backend/test/vehicles.e2e-spec.ts` |

### Phase 6: Frontend

| # | Task | Files |
|---|------|-------|
| 15 | `vehicles-api.ts`: 5 métodos espelhando `customers-api.ts` | `features/vehicles/api/vehicles-api.ts` |
| 16 | `use-vehicles.ts`: `useVehiclesList`, `useCreateVehicle`, `useUpdateVehicle`, `useDeleteVehicle` (invalidação da query `vehicles-list` nas mutations) | `features/vehicles/hooks/use-vehicles.ts` |
| 17 | `VehiclesTable.tsx`: estados loading/erro/vazio (mesmo padrão de `CustomersTable.tsx`); colunas marca/modelo/placa/cliente; botões editar/excluir só se `canManage` | `features/vehicles/components/VehiclesTable.tsx` |
| 18 | `VehicleFormModal.tsx`: schema Zod; seletor de cliente (`Select` populado via `useCustomersList({offset:0, limit:100})` — sem busca assíncrona nesta feature, ver Gotcha abaixo) visível só na criação; em edição, mostra o nome do cliente como texto read-only | `features/vehicles/components/VehicleFormModal.tsx` |
| 19 | `DeleteVehicleDialog.tsx`: mesmo padrão de `DeleteCustomerDialog.tsx`, aviso sobre ordens de serviço vinculadas | `features/vehicles/components/DeleteVehicleDialog.tsx` |
| 20 | `app/(dashboard)/vehicles/page.tsx`: monta tudo, busca por texto; `canManage = user?.role !== 'MECHANIC'` | `app/(dashboard)/vehicles/page.tsx` |
| 21 | Ativar o item "Veículos" na sidebar (mover de `UPCOMING_ITEMS` pra `NAV_ITEMS`, apontando pra `/vehicles`) | `components/dashboard/sidebar.tsx` |
| 22 | Adicionar `{ '/vehicles': { title: 'Veículos', description: '...' } }` ao mapa de título da Topbar | `components/dashboard/topbar.tsx` |
| 23 | Testes de componente (`VehiclesTable`, `VehicleFormModal`) — mesmo padrão de `CustomersTable.test.tsx`/`CustomerFormModal.test.tsx` | `features/vehicles/components/__tests__/VehiclesTable.test.tsx`, `.../VehicleFormModal.test.tsx` |

**Sequential**: 15 → 16 → (17, 18, 19 em paralelo) → 20 → (21, 22 em paralelo, triviais) → 23.

**Gotcha (seletor de cliente)**: `limit: 100` no `useCustomersList` do formulário é uma limitação conhecida — oficinas com mais de 100 clientes não veem todos no seletor. Aceitável pro MVP (mesma decisão pragmática de não introduzir uma lib de combobox nova agora); se virar problema real, trocar por um combobox com busca assíncrona é um follow-up isolado, não bloqueia esta feature.

---

## Parallel vs Sequential

| Parallel Group | Tasks | Why |
|---|---|---|
| Group A | 3, (nada mais na Fase 2) | |
| Group B | 7, 6 | arquivos independentes |
| Group C | 17, 18, 19 | três componentes de frontend independentes (dependem só do hook da Task 16) |
| Group D | 21, 22 | edições triviais e independentes em arquivos diferentes da sidebar já existente |

| Sequential | Depends On | Why |
|---|---|---|
| Task 2 | Task 1 | migration usa nomes de coluna do schema |
| Task 5 | — | pré-requisito de Task 8 (export do repositório) |
| Task 8 | Task 5, 6 | Manager injeta `CustomerRepository` (exportado) e chama `VehicleRepository` |
| Task 9 | Task 8 | testes do Manager |
| Task 11 | Task 10 | Controller usa os DTOs |
| Task 12 | Task 11 | Module registra o Controller; importa `CustomersModule` |
| Task 14 | Task 12, 13 | e2e precisa da API completa E do isolamento de tenant já ligado |
| Task 16 | Task 15 | hooks chamam o api client |
| Task 20 | Task 17, 18, 19 | página monta os três componentes |
| Task 23 | Task 17, 18 | testa os componentes já escritos |

**Bloqueio crítico (repetido da Feature 3, ainda mais fácil de esquecer aqui)**: Task 13
(`TENANT_SCOPED_MODELS`) e Task 5 (exportar `CustomerRepository`) são os
dois pontos onde esquecer quebra silenciosamente — o primeiro vaza dados
entre tenants, o segundo faz o `VehiclesModule` falhar ao subir (DI error)
só quando o `VehicleManager` tentar ser instanciado, não em tempo de
compilação do TypeScript.

---

## Testing Plan

**Business logic** (`vehicle.manager.spec.ts`, mocks manuais):
- create: `customerId` válido → sucesso; `customerId` inexistente →
  `VEHICLE_CUSTOMER_NOT_FOUND` (400); placa duplicada →
  `VEHICLE_PLATE_ALREADY_EXISTS` (409); corrida de placa (P2002 do
  Prisma) → 409, não 500 (mesmo teste da Feature 3, `finding 3`).
- update: veículo inexistente → `VEHICLE_NOT_FOUND` (404); `customerId`
  não é um parâmetro aceito pelo método (nem chega a ser testável no
  Manager — a rejeição acontece no DTO, coberto no e2e).
- delete: soft delete chama audit log; corrida concorrente (count 0) →
  404 sem gravar audit log (mesmo padrão da Feature 3).
- list: `search` filtra por marca/modelo/placa; `customerId` filtra só
  os veículos daquele cliente.

**API/integration** (`test/vehicles.e2e-spec.ts`):
- Happy path completo: create → get → update → list (com e sem filtro
  `customerId`) → delete.
- `customerId` inexistente ou de outro tenant → 400 (Edge Case 2).
- Placa duplicada no mesmo tenant → 409 (Edge Case 1).
- Mesma placa em dois tenants diferentes → ambos 201.
- `MECHANIC`: 403 em create/update/delete, 200 em get/list (Edge Case 3).
- `customerId` no body de `update` → 400, rejeitado pelo
  `forbidNonWhitelisted` (Edge Case 7).
- Teste de isolamento multi-tenant: veículo do tenant A não aparece em
  get/list/update/delete do tenant B (Edge Case 5).
- Soft delete + recriação com mesma placa → permitido (Edge Case 6).

**UI tests** (`VehiclesTable.test.tsx`, `VehicleFormModal.test.tsx`):
- Tabela: renderiza loading/erro/vazio/lista; botões de ação ausentes
  quando `canManage=false`.
- Form: seletor de cliente aparece só na criação; em edição, `customerId`
  nunca é enviado no payload de update (mesmo tipo de teste da Feature 3
  pra `type`/`document`).

---

## Gate 2 Checklist

**Architecture:**
- [x] Segue Controller → Manager → Repository (backend) e `api/hooks/
      components` (frontend), padrão idêntico às Features 2 e 3.
- [x] Cada camada só chama a de baixo. `VehicleManager` chama
      `CustomerRepository` (repositório de outro módulo, exportado
      explicitamente) — não chama `CustomersModule`'s Controller/Manager,
      mantendo o acoplamento no nível certo (repository-to-repository é
      aceitável pra uma checagem de existência simples; um Manager
      chamando outro Manager seria a alternativa se a validação fosse
      mais complexa).
- [x] Componentes nos diretórios corretos (`modules/vehicles/`,
      `features/vehicles/`).

**Task Breakdown:**
- [x] Todos os arquivos a alterar estão listados.
- [x] Todos os arquivos novos estão listados com localização.
- [x] Cada task é pequena (1-3 arquivos, um commit).
- [x] Dependências entre tasks estão claras.
- [x] Paralelo vs sequencial marcado.

**Testing:**
- [x] Testes de camada de dados planejados (via e2e, seguindo o padrão
      do projeto).
- [x] Testes de lógica de negócio planejados
      (`vehicle.manager.spec.ts`).
- [x] Testes de API/integração planejados (`vehicles.e2e-spec.ts`).
- [x] Testes de UI planejados (`VehiclesTable`/`VehicleFormModal`).
- [x] Edge cases da spec cobertos no plano de teste (todos os 8
      mapeados).

Gate 2 passou.
