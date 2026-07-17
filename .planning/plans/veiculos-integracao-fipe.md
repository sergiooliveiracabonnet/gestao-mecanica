# Plan: Integração FIPE (Marca/Modelo por Seleção)

**Spec**: .planning/specs/veiculos-integracao-fipe.md
**Epic**: none
**Created**: 2026-07-17
**Status**: draft

---

## Stack

Full-stack, mas com um módulo novo isolado (`fipe`) em vez de estender
um módulo existente — diferente das Features 5/6, que estendiam Ordem
de Serviço/Clientes. Diferenças estruturais desta feature:

- **Primeira chamada HTTP a uma API externa no backend** — todas as
  features anteriores só falavam com o próprio Postgres. Isola isso
  numa camada `Service` (`FipeClientService`), nunca chamada direto por
  Controller/Manager (ver `SERVICES_AND_BEANS.md`: Service busca dado
  externo, Manager persiste).
- **Primeiro job BullMQ *agendado/repetível*** — `audit-log.processor.ts`
  é o único precedente, mas é disparado sob demanda (`queue.add()` a
  cada log), nunca em cron. Aqui o job roda sozinho toda semana.
- **`fetch` nativo do Node** — sem adicionar `axios`/`got`; Node 24
  (>=20 requerido no `engines`) já tem `fetch` global.
- **Tabelas sem `tenant_id`** — dado de referência global, não de
  tenant (mesma exclusão de `TENANT_SCOPED_MODELS` já usada pra
  `ServiceOrderStatusHistory`, mas aqui por um motivo diferente: não é
  "tabela filha sem a coluna", é "não é dado de tenant nenhum").
- **Zero mudança em `vehicles`/`VehicleResponse`** — `brand`/`model`
  continuam texto livre; a integração só troca *como* esses campos são
  preenchidos na UI.

---

## Architecture

### Components

| Component | Type | Purpose |
|---|---|---|
| `FipeBrandRepository` | Repository | `createMany` (skip duplicates), `listByCategory`, `byId`, `byIds` |
| `FipeModelRepository` | Repository | `createMany` (skip duplicates), `listByBrandId`, `byId` |
| `FipeClientService` | Service | chama `fipe.parallelum.com.br/api/v2` — busca marcas/modelos crus, nunca toca o banco |
| `FipeSyncProcessor` | BullMQ Processor | worker do job de sincronização — orquestra `FipeClientService` + os 2 repositórios, direto (mesmo padrão de `AuditLogProcessor`, sem Manager no meio) |
| `FipeManager` | Manager | `listBrands`, `listModels` (leem do banco local), `triggerSync` (só enfileira o job) |
| `FipeController` | Controller | as 3 rotas HTTP |
| `FipeModule` | Module | wire; `onModuleInit` faz bootstrap-sync-se-vazio e registra o job semanal repetível |
| `fipe-api.ts` | Frontend API client | chama os 2 endpoints de leitura |
| `use-fipe.ts` | Frontend hooks | `useFipeBrands(category)`, `useFipeModels(brandId)` |
| `FipeBrandModelFields.tsx` | Frontend component | Categoria + Marca + Modelo com fallback "Outro", plugado no formulário de veículo via `form` (mesmo padrão de `form` por prop das abas da Feature 6) |

### File Locations

**Contratos compartilhados (`packages/contracts/`)**
| File | Location | Purpose |
|---|---|---|
| `fipe.response.ts` | `src/response/` | `FIPE_CATEGORIES`, `FipeCategory`, `FipeBrandResponse`, `FipeModelResponse` |

**Backend (`backend/src/modules/fipe/`)**
| File | Location | Purpose |
|---|---|---|
| `fipe-brand.repository.ts` | `repositories/` | acesso a `fipe_brands` |
| `fipe-model.repository.ts` | `repositories/` | acesso a `fipe_models` |
| `fipe-client.service.ts` | `services/` | HTTP pra API pública da FIPE |
| `fipe-sync.processor.ts` | `processors/` | worker BullMQ da sincronização |
| `fipe.manager.ts` (+ `.spec.ts`) | `managers/` | leitura + disparo de sync |
| `fipe.dto.ts` | `dto/` | `FipeBrandListDto`, `FipeModelListDto` |
| `fipe.controller.ts` | `controllers/` | rotas |
| `fipe.module.ts` | `modules/fipe/` | wire + bootstrap + job repetível |

**Backend (migrations/schema)**
| File | Location | Purpose |
|---|---|---|
| `6_fipe_catalog/migration.sql` | `database/prisma/migrations/` | `CREATE TABLE fipe_brands` + `fipe_models` + índices únicos |

**Frontend (`frontend/`)**
| File | Location | Purpose |
|---|---|---|
| `fipe-api.ts` | `features/fipe/api/` | chamadas HTTP |
| `use-fipe.ts` | `features/fipe/hooks/` | hooks React Query |
| `FipeBrandModelFields.tsx` (+ `__tests__/`) | `features/vehicles/components/` | Categoria/Marca/Modelo com fallback |

### Files to Change

| File | What Changes | Why |
|---|---|---|
| `database/prisma/schema.prisma` | adiciona `model FipeBrand` e `model FipeModel` | novos models, sem `tenantId` |
| `backend/src/shared/queue/queue.module.ts` | adiciona `export const FIPE_SYNC_QUEUE = 'fipe-sync'` + `BullModule.registerQueue({ name: FIPE_SYNC_QUEUE })` | fila nova, mesmo padrão de `AUDIT_LOG_QUEUE` |
| `backend/src/app.module.ts` | importa `FipeModule` | registra o novo módulo |
| `frontend/features/vehicles/components/VehicleFormModal.tsx` | troca os `FormField` de `brand`/`model` (hoje `Input` livre) por `<FipeBrandModelFields form={form} />` | integra a seleção FIPE sem mudar o schema Zod (`brand`/`model` continuam `string`) |

**Deliberadamente NÃO alterado**: `tenant-isolation.middleware.ts` —
`FipeBrand`/`FipeModel` NUNCA entram em `TENANT_SCOPED_MODELS` (ver
Gotchas).

---

## Phases

### Phase 1: Banco de dados

| # | Task | Files |
|---|------|-------|
| 1 | `model FipeBrand` (`category`, `fipeCode`, `name`, `syncedAt`, sem `tenantId`, índice único `(category, fipeCode)`) e `model FipeModel` (`brandId`, `fipeCode`, `name`, `syncedAt`, índice único `(brandId, fipeCode)`) | `database/prisma/schema.prisma` |
| 2 | Migration SQL: `CREATE TABLE fipe_brands` + `fipe_models`, índices únicos compostos + índice em `fipe_models.brand_id` | `database/prisma/migrations/6_fipe_catalog/migration.sql` |

**Sequential**: Task 2 depende da Task 1.

### Phase 2: Contratos compartilhados

| # | Task | Files |
|---|------|-------|
| 3 | `FIPE_CATEGORIES = ['CAR','MOTORCYCLE','TRUCK']`, `FipeCategory`, `FipeBrandResponse { id, name }`, `FipeModelResponse { id, name }` | `packages/contracts/src/response/fipe.response.ts` |
| 4 | Exportar no barrel | `packages/contracts/src/index.ts` |
| 5 | `pnpm --filter @oficina/contracts run build` | — |

**Sequential**: 3 → 4 → 5.

### Phase 3: Backend — camada de dados e cliente externo

| # | Task | Files |
|---|------|-------|
| 6 | `FipeBrandRepository`: `createMany(rows)` (`skipDuplicates: true`), `listByCategory(category)`, `byId(id)`, `byIds(ids)` | `modules/fipe/repositories/fipe-brand.repository.ts` |
| 7 | `FipeModelRepository`: `createMany(rows)` (`skipDuplicates: true`), `listByBrandId(brandId)`, `byId(id)` | `modules/fipe/repositories/fipe-model.repository.ts` |
| 8 | `FipeClientService`: `fetchBrands(category)` (`GET /api/v2/{cars\|motorcycles\|trucks}/brands`), `fetchModels(category, brandFipeCode)` (`GET .../brands/{code}/models`) — mapeia `category` pro segmento de URL certo (`CAR→cars`, `MOTORCYCLE→motorcycles`, `TRUCK→trucks`); usa `fetch` nativo, sem lib nova | `modules/fipe/services/fipe-client.service.ts` |
| 9 | `FIPE_SYNC_QUEUE` const + `registerQueue` | `shared/queue/queue.module.ts` |

**Parallel**: 6, 7, 8, 9 são independentes entre si.

### Phase 4: Backend — lógica de negócio e job

| # | Task | Files |
|---|------|-------|
| 10 | `FipeSyncProcessor.process()`: pra cada uma das 3 categorias — busca marcas via `FipeClientService`, `FipeBrandRepository.createMany`; pra cada marca recém-sincronizada, busca modelos via `FipeClientService`, `FipeModelRepository.createMany`; delay pequeno (ex: 150ms) entre chamadas de modelo pra não estourar o rate limit da API pública; erro numa categoria/marca é logado e não interrompe as outras (Edge Case 2/3 da spec — sync parcial não apaga nada já sincronizado) | `modules/fipe/processors/fipe-sync.processor.ts` |
| 11 | `FipeManager.listBrands(category)`, `listModels(brandId)` (leem do banco local via repositório), `triggerSync()` (`queue.add()`, retorna na hora, não espera o job) | `modules/fipe/managers/fipe.manager.ts` |
| 12 | Testes unitários: `FipeSyncProcessor` (mock de `FipeClientService` + repositórios — sync completo, uma categoria falhando não trava as outras) e `FipeManager` (mock do queue + repositórios) | `modules/fipe/processors/fipe-sync.processor.spec.ts`, `modules/fipe/managers/fipe.manager.spec.ts` |

**Sequential**: 10 depende de 6, 7, 8, 9. 11 depende de 6, 7, 9. 12 depende de 10 e 11.

### Phase 5: Backend — API

| # | Task | Files |
|---|------|-------|
| 13 | `FipeBrandListDto` (`category` com `@IsIn(FIPE_CATEGORIES)`), `FipeModelListDto` (`brandId` com `@IsUUID('4')`) | `modules/fipe/dto/fipe.dto.ts` |
| 14 | `FipeController` sob `@Controller('api/v1/fipe')`: `GET brands` (`@Roles` todos os 4 papéis), `GET models` (idem), `POST sync` (`@Roles('ADMIN')` só) | `modules/fipe/controllers/fipe.controller.ts` |
| 15 | `FipeModule`: `imports: [QueueModule]` (`@Global`, já traz `BullModule`), `providers`, `controllers`; `onModuleInit` — se `FipeBrandRepository.listByCategory('CAR')` vier vazio, `queue.add()` uma sincronização imediata; sempre registra o job repetível semanal (`queue.add(..., { repeat: { pattern: '0 3 * * 1' } })` — toda segunda 3h) | `modules/fipe/fipe.module.ts` |
| 16 | Registro em `app.module.ts` | `app.module.ts` |

**Sequential**: 13 → 14 → 15 → 16.

### Phase 6: Backend — testes e2e

| # | Task | Files |
|---|------|-------|
| 17 | `fipe.e2e-spec.ts`: seed direto no banco (`prisma.unscoped.fipeBrand`/`fipeModel`, sem chamar a API real da FIPE) → `GET /fipe/brands?category=CAR` retorna só as marcas daquela categoria; `GET /fipe/models?brand_id=` retorna só os modelos daquela marca; `brand_id` inexistente retorna lista vazia (200, Edge Case 5); `POST /fipe/sync` como não-ADMIN retorna 403 (Edge Case 6); `POST /fipe/sync` como ADMIN retorna 202 sem esperar o job terminar | `backend/test/fipe.e2e-spec.ts` |

### Phase 7: Frontend

| # | Task | Files |
|---|------|-------|
| 18 | `fipe-api.ts`: `listBrands(category)`, `listModels(brandId)` | `features/fipe/api/fipe-api.ts` |
| 19 | `use-fipe.ts`: `useFipeBrands(category)`, `useFipeModels(brandId, { enabled })` (mesmo padrão de `enabled` opcional já usado em `useServiceOrdersList` da Feature 6 — não busca modelos antes de uma marca ser escolhida) | `features/fipe/hooks/use-fipe.ts` |
| 20 | `FipeBrandModelFields.tsx`: `Select` de Categoria (padrão "CAR"); `Select` de Marca com opção sentinela `__OTHER__` no fim da lista — ao escolher, chama `form.setValue('brand', '')` e mostra `Input` livre; mesma lógica pro Modelo; trocar Categoria reseta marca/modelo escolhidos (Edge Case 4); lista vazia de marcas (categoria ainda não sincronizada) some com a lista real e sobra só "Outro" (Edge Case 1) | `features/vehicles/components/FipeBrandModelFields.tsx` |
| 21 | `VehicleFormModal.tsx`: troca os dois `FormField` de `brand`/`model` por `<FipeBrandModelFields form={form} />`; schema Zod não muda (`brand`/`model` continuam `z.string()`) | `features/vehicles/components/VehicleFormModal.tsx` |
| 22 | Testes de componente: `FipeBrandModelFields` — mostra "Outro" quando a lista vem vazia; selecionar "Outro" libera `Input`; trocar Categoria reseta Marca/Modelo; `VehicleFormModal` — fluxo completo Categoria→Marca→Modelo preenche `brand`/`model` no payload de criação | `features/vehicles/components/__tests__/FipeBrandModelFields.test.tsx`, atualiza `VehicleFormModal.test.tsx` |

**Sequential**: 18 → 19 → 20 → 21 → 22.

---

## Parallel vs Sequential

| Parallel Group | Tasks | Why |
|---|---|---|
| Group A | 6, 7, 8, 9 | arquivos independentes, sem import cruzado |

| Sequential | Depends On | Why |
|---|---|---|
| Task 2 | Task 1 | migration usa nomes de coluna do schema |
| Task 5 | Tasks 3, 4 | rebuild do pacote depois de editar os contratos |
| Tasks 6-16 | Task 5 | backend importa os tipos novos de `@oficina/contracts` |
| Task 10 | Tasks 6, 7, 8, 9 | processor usa repositórios + client + fila |
| Task 17 | Task 16 | e2e precisa da API completa |
| Tasks 18-22 | Task 5 | frontend importa os tipos novos |

**Bloqueio crítico**: esquecer de excluir `FipeBrand`/`FipeModel` de
`TENANT_SCOPED_MODELS` faria a extensão do Prisma tentar injetar
`tenant_id` em tabelas que não têm essa coluna — quebra em runtime na
primeira sincronização. Como a instrução aqui é **não tocar** nesse
arquivo, o risco real é o oposto de todo Gotcha anterior: é fácil
"corrigir" isso por engano vendo que outro model novo foi adicionado
recentemente (Customer, ServiceOrder, Feature 6) e replicar o padrão
sem pensar — checar este plano antes de mexer nesse arquivo.

---

## Gotchas

- **`FipeBrand`/`FipeModel` NUNCA entram em `TENANT_SCOPED_MODELS`** —
  são catálogo global, compartilhado entre todos os tenants, não dado
  de tenant nenhum. Diferente do caso do `ServiceOrderStatusHistory`
  (Feature 5), que é excluído por não ter a coluna mas ainda ser dado
  de UM tenant específico — aqui a mesma exclusão acontece por um
  motivo completamente diferente. Documentar isso com comentário
  explícito no schema e no controller, porque é fácil um reviewer
  futuro "corrigir" isso achando que foi esquecimento.
- **`createMany({ skipDuplicates: true })` não atualiza linhas
  existentes** — se uma marca mudar de nome na FIPE, a sincronização
  não reflete isso (só insere o que é novo). Decisão deliberada de
  simplicidade (mesma linha da spec sobre nunca remover marca que saiu
  da FIPE) — `synced_at` reflete "primeira vez vista", não "confirmada
  na última sincronização". Se isso virar problema real no futuro, o
  fix é trocar por upsert linha a linha (mais lento, mas atualiza).
- **Rate limit da API pública da FIPE observado empiricamente em
  ~1000 req/9h** — uma sincronização completa das 3 categorias usa
  ~300-400 requisições (1 por marca pra listar modelos). Cabe
  folgadamente, mas o delay de 150ms entre chamadas (Task 10) é
  intencional pra não rajar tudo de uma vez — API pública sem
  documentação de SLA, tratar com cuidado.
- **`FipeBrandModelFields` não é um `FormField` simples** — precisa de
  estado local (`useState`) pra controlar modo select-vs-manual de
  marca e modelo, além do `form.setValue` manual pra empurrar o texto
  escolhido pros campos `brand`/`model` do formulário pai. Diferente do
  padrão de `FormField` direto usado em todo o resto do formulário de
  veículo — é a primeira vez que um campo do formulário é preenchido
  indiretamente por uma seleção auxiliar em vez de digitação direta.

---

## Testing Plan

**Business logic** (`fipe-sync.processor.spec.ts`, `fipe.manager.spec.ts`):
- Sync processa as 3 categorias, upsert de marcas e modelos correto.
- Falha em uma categoria (client externo lança erro) não impede as
  outras duas de sincronizar — erro só é logado.
- `FipeManager.listBrands`/`listModels` leem só do banco local, nunca
  chamam `FipeClientService`.
- `triggerSync` só enfileira, não espera o processor terminar.

**API/integration** (`fipe.e2e-spec.ts`): ver Phase 6, Task 17 — cobre
os 3 endpoints, incluindo os edge cases de `brand_id` inexistente e
autorização do `POST /sync`.

**UI tests** (`FipeBrandModelFields.test.tsx`, `VehicleFormModal.test.tsx`):
- Lista de marcas vazia mostra só "Outro".
- Selecionar "Outro" libera `Input`, seleciona marca real preenche
  `brand` com o nome.
- Trocar Categoria reseta Marca/Modelo escolhidos.
- Fluxo completo (Categoria→Marca→Modelo) chega no payload de criação
  do veículo com `brand`/`model` como texto simples — sem campo novo
  no contrato.

---

## Gate 2 Checklist

**Architecture:**
- [x] Segue Controller → Manager → Repository, com `Service` isolado
      pra chamada externa (primeira vez neste padrão explícito, mas já
      previsto em `SERVICES_AND_BEANS.md`).
- [x] Processor BullMQ chama Service/Repository direto, sem Manager no
      meio — mesmo precedente de `AuditLogProcessor`.
- [x] Componentes nos diretórios corretos (`modules/fipe/`,
      `features/fipe/`, `features/vehicles/components/`).

**Task Breakdown:**
- [x] Todos os arquivos a alterar estão listados.
- [x] Todos os arquivos novos estão listados com localização.
- [x] Cada task é pequena (1-3 arquivos, um commit).
- [x] Dependências entre tasks estão claras.
- [x] Paralelo vs sequencial marcado.

**Testing:**
- [x] Testes de camada de dados planejados (via e2e + specs do
      processor/manager).
- [x] Testes de lógica de negócio planejados (sync parcial não quebra,
      leitura nunca chama a API externa).
- [x] Testes de API/integração planejados (`fipe.e2e-spec.ts`).
- [x] Testes de UI planejados (`FipeBrandModelFields`,
      `VehicleFormModal`).
- [x] Edge cases da spec cobertos no plano de teste (7 no total).

Gate 2 passou.
