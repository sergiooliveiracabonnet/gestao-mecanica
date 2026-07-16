# Plan: Clientes (CRUD PF/PJ)

**Spec**: .planning/specs/clientes-crud-pf-pj.md
**Epic**: nucleo-operacional-mvp
**Created**: 2026-07-16
**Status**: draft

---

## Stack

Full-stack — backend (NestJS, `backend/`) + frontend (Next.js App Router,
`frontend/`), seguindo exatamente os padrões estabelecidos na Feature 2 (IAM):
Controller → Manager → Repository no backend, `features/{domain}/{api,hooks,
components}` no frontend.

---

## Architecture

### Components

| Component | Type | Purpose |
|---|---|---|
| `DocumentValidatorService` | Shared Service (movido) | valida CPF/CNPJ por dígito verificador — hoje vive só em `modules/iam/services/`, mas Clientes também precisa; vira serviço compartilhado global |
| `CustomerRepository` | Repository | queries Prisma tenant-scoped (`this.prisma.client`) para `customers` |
| `CustomerManager` | Manager | valida documento, checa unicidade por tenant, orquestra create/update/delete/list/get, grava audit log |
| `CustomersController` | Controller | rotas HTTP RPC-style sob `/api/v1` |
| `CustomersModule` | Module | wire do controller/manager/repository |
| `customers-api.ts` | Frontend API client | chama os 5 endpoints |
| `use-customers.ts` | Frontend hooks | `useQuery`/`useMutation` (React Query) |
| `CustomersTable.tsx` | Frontend component | lista com estados loading/erro/vazio |
| `CustomerFormModal.tsx` | Frontend component | cria E edita (mesmo form; edição esconde `type`/`document`) |
| `DeleteCustomerDialog.tsx` | Frontend component | confirmação de exclusão com aviso |
| `/customers` page | Frontend page | monta os componentes acima, `AuthGuard` sem restrição de papel (todos os 4 papéis podem ver; botões de ação escondidos para `MECHANIC`) |

### File Locations

**Contratos compartilhados (`packages/contracts/`)**
| File | Location | Purpose |
|---|---|---|
| `customer.response.ts` | `src/response/` | `CUSTOMER_TYPES`, `CustomerType`, `CustomerAddress`, `CustomerResponse`, `CustomerListItemResponse` |
| `customer.request.ts` | `src/request/` | `CreateCustomerRequest`, `UpdateCustomerRequest`, `DeleteCustomerRequest`, `CustomerListRequest` |

**Backend (`backend/src/`)**
| File | Location | Purpose |
|---|---|---|
| `document-validator.service.ts` (+ `.spec.ts`) | `shared/documents/` (movido de `modules/iam/services/`) | validação de CPF/CNPJ, agora reusável |
| `documents.module.ts` | `shared/documents/` | módulo `@Global()` exportando `DocumentValidatorService`, mesmo padrão de `AuditLogModule`/`TenantContextModule` |
| `customer.repository.ts` | `modules/customers/repositories/` | CRUD + list tenant-scoped |
| `customer.manager.ts` (+ `.spec.ts`) | `modules/customers/managers/` | lógica de negócio |
| `customer.dto.ts` | `modules/customers/dto/` | `class-validator` DTOs |
| `customers.controller.ts` | `modules/customers/controllers/` | rotas |
| `customers.module.ts` | `modules/customers/` | wire do módulo |

**Backend (migrations/schema)**
| File | Location | Purpose |
|---|---|---|
| `2_customers/migration.sql` | `database/prisma/migrations/` | `CREATE TABLE customers` + índices |

**Frontend (`frontend/`)**
| File | Location | Purpose |
|---|---|---|
| `customers-api.ts` | `features/customers/api/` | chamadas HTTP |
| `use-customers.ts` | `features/customers/hooks/` | hooks React Query |
| `CustomersTable.tsx` (+ `__tests__/`) | `features/customers/components/` | tabela |
| `CustomerFormModal.tsx` (+ `__tests__/`) | `features/customers/components/` | form criar/editar |
| `DeleteCustomerDialog.tsx` | `features/customers/components/` | confirmação de exclusão |
| `page.tsx` | `app/(dashboard)/customers/` | rota `/customers` |

### Files to Change

| File | What Changes | Why |
|---|---|---|
| `database/prisma/schema.prisma` | adiciona `model Customer` | novo model tenant-scoped |
| `backend/src/shared/prisma/tenant-isolation.middleware.ts` | adiciona `'Customer'` a `TENANT_SCOPED_MODELS` | sem isso, `CustomerRepository` roda **sem** filtro de tenant — vazamento cross-tenant |
| `backend/src/shared/errors/app-error-code.ts` | adiciona `CUSTOMER_DOCUMENT_ALREADY_EXISTS`, `CUSTOMER_NOT_FOUND` | erros específicos do domínio |
| `backend/src/app.module.ts` | importa `DocumentsModule` e `CustomersModule` | registra os novos módulos |
| `backend/src/modules/iam/iam.module.ts` | remove `DocumentValidatorService` dos `providers` (passa a vir do `DocumentsModule` global) | evita registrar o serviço duas vezes em módulos diferentes |
| `backend/src/modules/iam/managers/auth.manager.ts` | atualiza import de `DocumentValidatorService` para o novo caminho | acompanha o move |
| `backend/src/modules/iam/managers/auth.manager.spec.ts` | idem | idem |
| `packages/contracts/src/index.ts` | exporta `customer.request`/`customer.response` | barrel file |
| `frontend/app/layout.tsx` ou nav existente (verificar durante o build) | adiciona link "Clientes" na navegação, se houver menu | sem isso a tela fica inacessível por UI (só por URL direta) |

---

## Phases

### Phase 0: Refactor — DocumentValidatorService compartilhado

Pré-requisito para tudo que segue: `CustomerManager` precisa validar CPF/CNPJ
e hoje esse serviço só existe dentro do módulo IAM.

| # | Task | Files |
|---|------|-------|
| 1 | Mover `DocumentValidatorService` + spec para `shared/documents/`; criar `DocumentsModule` (`@Global()`, `providers: [DocumentValidatorService]`, `exports: [DocumentValidatorService]`) | `shared/documents/document-validator.service.ts`, `shared/documents/document-validator.service.spec.ts`, `shared/documents/documents.module.ts` |
| 2 | Atualizar imports (`iam.module.ts` remove do providers, `auth.manager.ts` e `auth.manager.spec.ts` apontam pro novo caminho); registrar `DocumentsModule` em `app.module.ts` | `modules/iam/iam.module.ts`, `modules/iam/managers/auth.manager.ts`, `modules/iam/managers/auth.manager.spec.ts`, `app.module.ts` |

**Checkpoint**: `pnpm --filter @oficina/backend test` continua 100% verde (78/78) antes de prosseguir — se este refactor quebrar algo, para aqui.

### Phase 1: Banco de dados

| # | Task | Files |
|---|------|-------|
| 3 | Adicionar `model Customer` ao `schema.prisma` (campos da spec: `type`, `document`, `name`, `email?`, `phone`, `address? Json`, `notes?`, + padrão `id`/`tenantId`/timestamps) | `database/prisma/schema.prisma` |
| 4 | Escrever migration SQL: `CREATE TABLE customers`, índice normal em `tenant_id`, **índice único parcial composto** `(tenant_id, document) WHERE deleted_at IS NULL` (documento único *por tenant*, diferente do índice single-column de `tenants.document`), índice parcial em `deleted_at` para limpeza | `database/prisma/migrations/2_customers/migration.sql` |

**Sequential**: Task 4 depende da Task 3 (schema define os nomes de coluna que a migration usa).

### Phase 2: Contratos compartilhados

| # | Task | Files |
|---|------|-------|
| 5 | Criar `response/customer.response.ts` (`CUSTOMER_TYPES`, `CustomerType`, `CustomerAddress`, `CustomerResponse`, `CustomerListItemResponse`) e `request/customer.request.ts` (`CreateCustomerRequest`, `UpdateCustomerRequest`, `DeleteCustomerRequest`, `CustomerListRequest extends PageableRequest`) | `packages/contracts/src/response/customer.response.ts`, `packages/contracts/src/request/customer.request.ts` |
| 6 | Exportar os dois novos arquivos no barrel | `packages/contracts/src/index.ts` |

### Phase 3: Backend — camada de dados e negócio

| # | Task | Files |
|---|------|-------|
| 7 | `CustomerRepository`: `insert`, `update` (updateMany where id+deletedAt null), `softDelete`, `byId`, `byDocument` (unicidade), `listByTenant(offset, limit, search?)` — todos via `this.prisma.client` (tenant-scoped) | `modules/customers/repositories/customer.repository.ts` |
| 8 | Adicionar `CUSTOMER_DOCUMENT_ALREADY_EXISTS`, `CUSTOMER_NOT_FOUND` ao enum de erros | `shared/errors/app-error-code.ts` |
| 9 | `CustomerManager`: `create` (valida documento via `DocumentValidatorService`, checa unicidade, insere, audit log `customer.created`), `update` (404 se não achar, audit log `customer.updated`), `delete` (soft delete, audit log `customer.deleted`), `getById` (404), `list` (com `search`) | `modules/customers/managers/customer.manager.ts` |
| 10 | Testes unitários do `CustomerManager` (mocks manuais do repository/audit log/document validator, mesmo padrão de `user.manager.spec.ts`) | `modules/customers/managers/customer.manager.spec.ts` |

**Sequential**: 7 → 9 (Manager depende do Repository) → 10 (testes do Manager). Task 8 é independente, pode rodar em paralelo com 7.

### Phase 4: Backend — API

| # | Task | Files |
|---|------|-------|
| 11 | DTOs `class-validator`: `CreateCustomerDto`, `UpdateCustomerDto`, `DeleteCustomerDto`, `GetCustomerDto` (`@IsUUID()` no `id` via query), `CustomerListDto` (`search?`, `offset`, `limit`) | `modules/customers/dto/customer.dto.ts` |
| 12 | `CustomersController` sob `@Controller('api/v1')`: `POST customers` (create, `@Roles('ADMIN','MANAGER','FRONT_DESK')`), `POST customers/update`, `POST customers/delete` (mesmos papéis), `GET customer` (todos os 4 papéis), `POST customers/list` (todos os 4 papéis) | `modules/customers/controllers/customers.controller.ts` |
| 13 | `CustomersModule` (controllers + providers) e registro em `app.module.ts` | `modules/customers/customers.module.ts`, `app.module.ts` |
| 14 | Adicionar `'Customer'` a `TENANT_SCOPED_MODELS` em `tenant-isolation.middleware.ts` — **crítico**, sem isso toda query do `CustomerRepository` roda sem filtro de tenant | `shared/prisma/tenant-isolation.middleware.ts` |

**Sequential**: 11 → 12 → 13. Task 14 é independente (arquivo diferente), mas **deve** estar feita antes de qualquer teste e2e rodar contra dados reais — marcar como bloqueante junto com a Fase 5.

### Phase 5: Backend — testes e2e

| # | Task | Files |
|---|------|-------|
| 15 | `test/customers.e2e-spec.ts`: happy path (create/update/delete/get/list), papéis (`MECHANIC` 403 em create/update/delete, 200 em get/list), documento duplicado no mesmo tenant (409), documento inválido (400), mesmo documento em dois tenants diferentes (ambos 201), isolamento multi-tenant (cliente do tenant A não aparece pro tenant B) — usar `configureApp()` de `src/bootstrap.ts` e `generateValidCpf()` de `test/utils/generate-cpf.ts`, já existentes | `backend/test/customers.e2e-spec.ts` |

### Phase 6: Frontend

| # | Task | Files |
|---|------|-------|
| 16 | `customers-api.ts`: 5 métodos espelhando `users-api.ts` | `features/customers/api/customers-api.ts` |
| 17 | `use-customers.ts`: `useCustomersList`, `useCreateCustomer`, `useUpdateCustomer`, `useDeleteCustomer` (React Query, invalidação da query `customers-list` nas mutations) | `features/customers/hooks/use-customers.ts` |
| 18 | `CustomersTable.tsx`: estados loading/erro/vazio (mesmo padrão de `UsersTable.tsx`); colunas nome/documento/telefone/tipo; botões editar/excluir só renderizam se `canManage` (prop) | `features/customers/components/CustomersTable.tsx` |
| 19 | `CustomerFormModal.tsx`: schema Zod (`type`, `document`, `name`, `phone` obrigatórios; `email`, `notes` opcionais); em modo edição, `type`/`document` somem do form (não editáveis) — mesmo padrão de `react-hook-form` + `zodResolver` de `InviteUserModal.tsx`. **Sem lib de máscara nova** — input de texto simples com placeholder, igual ao campo de documento do `SignupForm.tsx` | `features/customers/components/CustomerFormModal.tsx` |
| 20 | `DeleteCustomerDialog.tsx`: `Dialog` de confirmação com aviso genérico ("este cliente pode ter veículos/ordens de serviço vinculados") | `features/customers/components/DeleteCustomerDialog.tsx` |
| 21 | `app/(dashboard)/customers/page.tsx`: monta tudo, `AuthGuard` **sem** `allowedRoles` (todos os 4 papéis acessam a página); busca por texto; `canManage = user?.role !== 'MECHANIC'` controla visibilidade dos botões | `app/(dashboard)/customers/page.tsx` |
| 22 | Testes de componente (`CustomersTable`, `CustomerFormModal`) — mesmo padrão de `SignupForm.test.tsx`/`LoginForm.test.tsx` | `features/customers/components/__tests__/CustomersTable.test.tsx`, `.../CustomerFormModal.test.tsx` |

**Sequential**: 16 → 17 → (18, 19, 20 em paralelo — componentes independentes) → 21 (página integra os três) → 22.

---

## Parallel vs Sequential

| Parallel Group | Tasks | Why |
|---|---|---|
| Group A | 5, (nada mais na Fase 2) | só um arquivo de contratos por vez faz sentido, mas 5 e 6 podem ser o mesmo commit |
| Group B | 8, 7 | `app-error-code.ts` e `customer.repository.ts` são arquivos independentes |
| Group C | 18, 19, 20 | três componentes de frontend independentes entre si (só dependem do hook da Task 17) |

| Sequential | Depends On | Why |
|---|---|---|
| Task 4 | Task 3 | migration usa os nomes de coluna definidos no schema |
| Task 9 | Task 7 | Manager chama métodos do Repository |
| Task 10 | Task 9 | testes do Manager |
| Task 12 | Task 11 | Controller usa os DTOs |
| Task 13 | Task 12 | Module registra o Controller |
| Task 15 | Task 13, 14 | e2e precisa da API completa E do isolamento de tenant já ligado |
| Task 17 | Task 16 | hooks chamam o api client |
| Task 21 | Task 18, 19, 20 | página monta os três componentes |
| Task 22 | Task 18, 19 | testa os componentes já escritos |

**Bloqueio crítico**: Task 14 (`TENANT_SCOPED_MODELS`) é fácil de esquecer porque não quebra nada em dev local com um único tenant — só aparece como vazamento de dados com 2+ tenants. **Task 15 (e2e) não pode ser considerada "passou" sem o teste de isolamento multi-tenant rodando de verdade**, exatamente porque esse é o tipo de bug que passa despercebido até virar incidente em produção.

---

## Testing Plan

**Data layer** (`customer.repository` — coberto indiretamente via e2e, não tem spec unitário próprio porque repositories neste projeto não são testados isoladamente, ver padrão de `user.repository.ts`/`tenant.repository.ts`):
- insert, update, soft delete, `byDocument` (para checagem de unicidade), `listByTenant` com `search`.

**Business logic** (`customer.manager.spec.ts`, mocks manuais):
- create: documento válido → sucesso; documento inválido → `VALIDATION_ERROR`; documento duplicado → `CUSTOMER_DOCUMENT_ALREADY_EXISTS` (409).
- update: cliente inexistente → `CUSTOMER_NOT_FOUND` (404); `type`/`document` no body são ignorados (não alteram o registro).
- delete: soft delete chama `audit log` com `customer.deleted`.
- list: `search` filtra por nome OU documento.

**API/integration** (`test/customers.e2e-spec.ts`):
- Happy path completo: create → get → update → list → delete.
- `MECHANIC`: 403 em create/update/delete, 200 em get/list (spec Edge Case 3).
- Documento duplicado no mesmo tenant → 409 (Edge Case 1).
- Documento inválido → 400 (Edge Case 2).
- Mesmo documento em dois tenants diferentes → ambos 201 (Edge Case 1, contraste).
- Isolamento multi-tenant: cliente do tenant A não aparece em get/list/update/delete do tenant B (Edge Case 5, mesmo padrão de `tenant-isolation.e2e-spec.ts`).
- Reativar com mesmo documento após soft delete → permitido (Edge Case 6).

**UI tests** (`CustomersTable.test.tsx`, `CustomerFormModal.test.tsx`):
- Tabela: renderiza loading/erro/vazio/lista; botões de ação ausentes quando `canManage=false`.
- Form: valida campos obrigatórios (Zod); modo edição não mostra `type`/`document`; submit chama a mutation certa.

---

## Gate 2 Checklist

**Architecture:**
- [x] Segue Controller → Manager → Repository (backend) e `api/hooks/components` (frontend), padrão idêntico à Feature 2.
- [x] Cada camada só chama a de baixo (Controller → Manager → Repository; nunca Controller → Repository).
- [x] Componentes nos diretórios corretos (`modules/customers/`, `features/customers/`).

**Task Breakdown:**
- [x] Todos os arquivos a alterar estão listados (tabela "Files to Change").
- [x] Todos os arquivos novos estão listados com localização.
- [x] Cada task é pequena (1-3 arquivos, um commit).
- [x] Dependências entre tasks estão claras (tabela Sequential).
- [x] Paralelo vs sequencial marcado.

**Testing:**
- [x] Testes de camada de dados planejados (via e2e, seguindo o padrão do projeto).
- [x] Testes de lógica de negócio planejados (`customer.manager.spec.ts`).
- [x] Testes de API/integração planejados (`customers.e2e-spec.ts`).
- [x] Testes de UI planejados (`CustomersTable`/`CustomerFormModal`).
- [x] Edge cases da spec cobertos no plano de teste (todos os 7 mapeados).

Gate 2 passou.
