# Plan: Cadastro de Cliente Expandido

**Spec**: .planning/specs/cadastro-cliente-expandido.md
**Epic**: crm-avancado-cliente-manutencao-preventiva
**Created**: 2026-07-17
**Status**: draft

---

## Stack

Full-stack — mesmo padrão das Features 3-5: Controller → Manager →
Repository no backend, `features/{domain}/{api,hooks,components}` no
frontend. Diferenças estruturais desta feature:

- **Sem tabela nova** — só estende `customers` (7 colunas) e o filtro de
  `service_orders/list` (1 campo). Nenhum repositório novo.
- **Primeiro uso de abas no frontend** — `CustomerFormModal.tsx` (hoje
  363 linhas, um formulário linear) vira um shell fino que monta 5
  componentes de aba, cada um com seu próprio grupo de `FormField`.
  Evita um arquivo único de 700+ linhas.
- **Nova dependência de UI** — `@radix-ui/react-tabs` não está instalado;
  precisa entrar no `package.json` do frontend antes do primitivo
  `Tabs` existir.
- **Toca dois módulos backend** — `customers` (campos novos) e
  `service-orders` (filtro `customerId` no `list`), sem nenhuma
  dependência de import cruzado entre eles (o filtro é só mais um
  parâmetro opcional no `where` do Prisma).

---

## Architecture

### Components

| Component | Type | Purpose |
|---|---|---|
| `CustomerRepository` | Repository | `insert`/`update` passam a aceitar os 7 campos novos |
| `CustomerManager` | Manager | repassa os campos novos no create/update, inclui no `toResponse` |
| `ServiceOrderRepository` | Repository | `listByTenant` ganha parâmetro `customerId?` no `where` |
| `ServiceOrderManager` | Manager | `list()` repassa `request.customerId` pro repository |
| `Tabs` | Frontend primitive | shadcn/Radix, novo no projeto |
| `CustomerGeneralTab` | Frontend component | tipo, documento, nome, telefone, e-mail, endereço, rg/IE condicional |
| `CustomerContactTab` | Frontend component | 3 campos de contato secundário |
| `CustomerPreferencesTab` | Frontend component | 2 selects de preferência de comunicação |
| `CustomerNotesTab` | Frontend component | `notes` como `Textarea` |
| `CustomerHistoryTab` | Frontend component | `ServiceOrdersTable` reaproveitada, filtrada por `customerId`; estado desabilitado em modo criação |
| `CustomerFormModal` | Frontend component | encolhe pra shell: `Dialog` mais largo + `Tabs` + montagem dos 5 componentes acima |

### File Locations

**Contratos compartilhados (`packages/contracts/`)**
| File | Location | Purpose |
|---|---|---|
| `customer.response.ts` | `src/response/` | adiciona os 7 campos + `CUSTOMER_CONTACT_CHANNELS`/`CustomerContactChannel`, `CUSTOMER_CONTACT_TIMES`/`CustomerContactTime` |
| `customer.request.ts` | `src/request/` | adiciona os 7 campos opcionais em `CreateCustomerRequest`/`UpdateCustomerRequest` |
| `service-order.request.ts` | `src/request/` | adiciona `customerId?` em `ServiceOrderListRequest` |

**Backend (`backend/src/`)**
| File | Location | Purpose |
|---|---|---|
| `customer.repository.ts` | `modules/customers/repositories/` | `CreateCustomerInput`/`UpdateCustomerInput` + `insert`/`update` |
| `customer.manager.ts` | `modules/customers/managers/` | `create`/`update`/`toResponse` |
| `customer.dto.ts` | `modules/customers/dto/` | `CreateCustomerDto`/`UpdateCustomerDto` com os 7 campos validados |
| `service-order.repository.ts` | `modules/service-orders/repositories/` | `listByTenant` ganha `customerId?` |
| `service-order.manager.ts` | `modules/service-orders/managers/` | `list()` repassa o filtro |
| `service-order.dto.ts` | `modules/service-orders/dto/` | `ServiceOrderListDto` ganha `customerId?` |

**Backend (migrations/schema)**
| File | Location | Purpose |
|---|---|---|
| `5_customer_details/migration.sql` | `database/prisma/migrations/` | `ALTER TABLE customers ADD COLUMN` × 7 |

**Frontend (`frontend/`)**
| File | Location | Purpose |
|---|---|---|
| `tabs.tsx` | `components/ui/` | primitivo shadcn novo (Radix Tabs) |
| `CustomerGeneralTab.tsx` | `features/customers/components/tabs/` | aba 1 |
| `CustomerContactTab.tsx` | `features/customers/components/tabs/` | aba 2 |
| `CustomerPreferencesTab.tsx` | `features/customers/components/tabs/` | aba 3 |
| `CustomerNotesTab.tsx` | `features/customers/components/tabs/` | aba 4 |
| `CustomerHistoryTab.tsx` | `features/customers/components/tabs/` | aba 5 |
| `CustomerFormModal.tsx` | `features/customers/components/` | reescrito como shell (existente, reescrita grande) |

### Files to Change

| File | What Changes | Why |
|---|---|---|
| `database/prisma/schema.prisma` | 7 campos novos em `model Customer` | schema-first, migration gerada a partir daqui |
| `frontend/package.json` | adiciona `@radix-ui/react-tabs` | dependência do primitivo `Tabs` |
| `backend/src/modules/customers/managers/customer.manager.spec.ts` | novos casos pros 7 campos | cobertura da Feature |
| `backend/test/customers.e2e-spec.ts` | novos casos pros 7 campos | cobertura e2e |
| `backend/test/service-orders.e2e-spec.ts` | novo caso pro filtro `customer_id` | cobertura e2e |
| `frontend/features/customers/components/__tests__/CustomerFormModal.test.tsx` | reescrito pra testar as 5 abas | componente mudou de formato |

---

## Phases

### Phase 1: Banco de dados

| # | Task | Files |
|---|------|-------|
| 1 | Adicionar `rg`, `stateRegistration`, `secondaryContactName`, `secondaryContactPhone`, `secondaryContactRelation`, `preferredContactChannel`, `preferredContactTime` (todos `String?`) ao `model Customer` | `database/prisma/schema.prisma` |
| 2 | Migration SQL: `ALTER TABLE customers ADD COLUMN` pras 7 colunas, todas nullable, sem default | `database/prisma/migrations/5_customer_details/migration.sql` |

**Sequential**: Task 2 depende da Task 1 (nomes de coluna vêm do schema).

### Phase 2: Contratos compartilhados

| # | Task | Files |
|---|------|-------|
| 3 | `CUSTOMER_CONTACT_CHANNELS = ['PHONE','WHATSAPP','EMAIL','SMS']`, `CUSTOMER_CONTACT_TIMES = ['MORNING','AFTERNOON','EVENING','ANY']` + os 7 campos em `CustomerResponse` | `packages/contracts/src/response/customer.response.ts` |
| 4 | Os 7 campos opcionais em `CreateCustomerRequest`/`UpdateCustomerRequest` | `packages/contracts/src/request/customer.request.ts` |
| 5 | `customerId?: string` em `ServiceOrderListRequest` | `packages/contracts/src/request/service-order.request.ts` |
| 6 | `pnpm --filter @oficina/contracts run build` — rebuild obrigatório antes de qualquer backend importar os campos novos (ver Gotcha da Feature 5 sobre isso) | — |

**Parallel**: 3, 4, 5 são arquivos independentes. Task 6 depende de 3-5.

### Phase 3: Backend — Clientes

| # | Task | Files |
|---|------|-------|
| 7 | `CreateCustomerInput`/`UpdateCustomerInput` + `insert`/`update` passam os 7 campos pro Prisma | `modules/customers/repositories/customer.repository.ts` |
| 8 | `CustomerManager.create`/`update` repassam os 7 campos; `toResponse` inclui os 7 campos (`?? undefined`, mesmo padrão dos campos opcionais existentes) | `modules/customers/managers/customer.manager.ts` |
| 9 | `CreateCustomerDto`/`UpdateCustomerDto`: `rg`/`secondaryContactName`/`secondaryContactPhone`/`secondaryContactRelation` com `@IsOptional() @IsString()`; `preferredContactChannel` com `@IsOptional() @IsIn(CUSTOMER_CONTACT_CHANNELS)`; `preferredContactTime` com `@IsOptional() @IsIn(CUSTOMER_CONTACT_TIMES)`; `stateRegistration` com `@IsOptional() @IsString()` | `modules/customers/dto/customer.dto.ts` |
| 10 | Testes unitários: create/update persistindo os 7 campos; campos parcialmente preenchidos aceitos; canal/horário fora do enum rejeitado (400) | `modules/customers/managers/customer.manager.spec.ts` |

**Sequential**: 7 → 8 → 9 → 10 (mesmo fluxo incremental das features anteriores).

### Phase 4: Backend — filtro de Ordem de Serviço por cliente

| # | Task | Files |
|---|------|-------|
| 11 | `listByTenant` ganha parâmetro `customerId?: string`, adicionado ao `where` do Prisma (mesmo padrão de `vehicleId`/`technicianId` já existentes) | `modules/service-orders/repositories/service-order.repository.ts` |
| 12 | `ServiceOrderManager.list` repassa `request.customerId` pro repository | `modules/service-orders/managers/service-order.manager.ts` |
| 13 | `ServiceOrderListDto.customerId` opcional com `@IsUUID('4')` | `modules/service-orders/dto/service-order.dto.ts` |

**Sequential**: 11 → 12 → 13. Independente da Phase 3 (módulos diferentes, sem import cruzado) — pode rodar em paralelo com ela.

### Phase 5: Backend — testes e2e

| # | Task | Files |
|---|------|-------|
| 14 | `customers.e2e-spec.ts`: criar/editar cliente com os 7 campos novos (happy path); canal/horário inválido retorna 400; campos parcialmente preenchidos aceitos; `rg` preenchido num cliente PJ não é bloqueado (edge case 3 da spec) | `backend/test/customers.e2e-spec.ts` |
| 15 | `service-orders.e2e-spec.ts`: filtro `customer_id` retorna só as OS daquele cliente; `customer_id` de outro tenant retorna lista vazia (isolamento) | `backend/test/service-orders.e2e-spec.ts` |

**Sequential**: 14 depende de Phase 3 completa (9). 15 depende de Phase 4 completa (13). 14 e 15 são independentes entre si.

### Phase 6: Frontend — primitivo Tabs

| # | Task | Files |
|---|------|-------|
| 16 | `pnpm --filter @oficina/frontend add @radix-ui/react-tabs` | `frontend/package.json` |
| 17 | `components/ui/tabs.tsx`: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` — implementação padrão shadcn sobre `@radix-ui/react-tabs`, usando os tokens de cor já definidos (`bg-muted`, `text-muted-foreground`, `data-[state=active]:bg-background`) | `frontend/components/ui/tabs.tsx` |

**Sequential**: 17 depende de 16.

### Phase 7: Frontend — abas e modal

| # | Task | Files |
|---|------|-------|
| 18 | `CustomerGeneralTab.tsx`: campos existentes (tipo, documento, nome, telefone, e-mail, endereço) migrados do `CustomerFormModal` atual sem mudar comportamento + `rg` (visível se `type === 'PF'`) / `stateRegistration` (visível se `type === 'PJ'`) | `features/customers/components/tabs/CustomerGeneralTab.tsx` |
| 19 | `CustomerContactTab.tsx`: `secondaryContactName`, `secondaryContactPhone`, `secondaryContactRelation` — 3 `Input` simples, tudo opcional | `features/customers/components/tabs/CustomerContactTab.tsx` |
| 20 | `CustomerPreferencesTab.tsx`: 2 `Select` (canal, horário) com as opções de `CUSTOMER_CONTACT_CHANNELS`/`CUSTOMER_CONTACT_TIMES`, rótulos em português | `features/customers/components/tabs/CustomerPreferencesTab.tsx` |
| 21 | `CustomerNotesTab.tsx`: `notes` como `Textarea` (migrado do `Input` atual) | `features/customers/components/tabs/CustomerNotesTab.tsx` |
| 22 | `CustomerHistoryTab.tsx`: `useServiceOrdersList({ customerId: customer.id, offset: 0, limit: 20 })` + `ServiceOrdersTable` reaproveitada sem modificação; se `!customer` (modo criação), mostra estado desabilitado ("Disponível depois de salvar o cliente") sem chamar o hook (`enabled: Boolean(customer?.id)`) | `features/customers/components/tabs/CustomerHistoryTab.tsx` |
| 23 | `CustomerFormModal.tsx`: `DialogContent` ganha `sm:max-w-2xl lg:max-w-3xl`; corpo do formulário troca o layout linear pelo shell `Tabs` com as 5 abas montando os componentes das Tasks 18-22; schema Zod (`customerSchema`) ganha os 7 campos novos como opcionais; `onSubmit` inclui os 7 campos no payload de create/update | `features/customers/components/CustomerFormModal.tsx` |
| 24 | Testes de componente: cada aba renderiza os campos esperados; trocar de aba preserva valores preenchidos noutra aba (edge case 5 da spec); aba Histórico desabilitada em modo criação; aba Histórico mostra lista em modo edição | `features/customers/components/__tests__/CustomerFormModal.test.tsx` |

**Sequential**: 18-22 podem rodar em paralelo entre si (arquivos independentes, todos consomem o mesmo `form` via prop). 23 depende de 18-22 (monta todos). 24 depende de 23.

---

## Parallel vs Sequential

| Parallel Group | Tasks | Why |
|---|---|---|
| Group A | 3, 4, 5 | arquivos de contrato independentes |
| Group B | Phase 3 (7-10) e Phase 4 (11-13) | módulos backend diferentes, sem import cruzado |
| Group C | 18, 19, 20, 21, 22 | componentes de aba independentes, todos recebem `form` por prop |

| Sequential | Depends On | Why |
|---|---|---|
| Task 2 | Task 1 | migration usa nomes de coluna do schema |
| Task 6 | Tasks 3, 4, 5 | rebuild do pacote depois de editar os contratos |
| Tasks 7-10 | Task 6 | Manager/Repository importam os tipos novos de `@oficina/contracts` |
| Tasks 11-13 | Task 6 | idem, pro campo `customerId` |
| Task 14 | Task 9 | e2e precisa da API completa de Clientes |
| Task 15 | Task 13 | e2e precisa do filtro completo |
| Task 17 | Task 16 | primitivo depende da dependência instalada |
| Task 23 | Tasks 18-22 | shell monta os 5 componentes de aba |
| Task 24 | Task 23 | testa o modal já remontado |

**Bloqueio crítico**: esquecer o rebuild do `@oficina/contracts` (Task 6)
depois de editar os contratos faz o backend compilar contra tipos
desatualizados — mesmo erro que já aconteceu ao vivo durante o
gate-review da Feature 5 nesta sessão (`Module '"@oficina/contracts"'
has no exported member`).

---

## Gotchas

- **Rebuild do pacote `contracts` não é automático em dev** — `tsc -p
  tsconfig.json` só roda via `pnpm run build`, não fica em watch mode
  durante `pnpm run dev` do backend/frontend. Depois de editar
  `customer.response.ts`/`customer.request.ts`/`service-order.request.ts`,
  rodar `pnpm --filter @oficina/contracts run build` antes de reiniciar
  o backend — já causou um crash de TS real nesta sessão (Feature 5,
  durante a troca de paleta) por esquecimento.
- **`rg`/`stateRegistration` sem validação cruzada de propósito** — a UI
  só *sugere* o campo certo por `type` (esconde o outro), mas o backend
  aceita os dois preenchidos ao mesmo tempo sem erro. Não é um buraco de
  validação esquecido, é a decisão explícita do Edge Case 3 da spec.
- **Aba Histórico não deve chamar a API em modo criação** — `enabled:
  Boolean(customer?.id)` no `useServiceOrdersList` (ou não chamar o hook
  de jeito nenhum se `!customer`); esquecer isso manda um `customerId:
  undefined` pro backend, que hoje trataria como "sem filtro" e listaria
  a OS de *todo mundo* do tenant dentro do modal — bug sutil, silencioso,
  mas real.
- **`ServiceOrdersTable` mostra a coluna "Cliente" mesmo dentro da aba
  Histórico** — redundante (é sempre o mesmo cliente, o do modal aberto),
  mas reaproveitar o componente sem modificação é a decisão de escopo da
  spec (evita criar uma variante só pra esconder uma coluna). Não é bug,
  é escolha deliberada de não expandir o escopo do componente.
- **Aba Histórico precisa de paginação de verdade** — a primeira versão
  buscava só `offset:0, limit:20` fixo, sem estado nem botões
  Anterior/Próxima; um cliente com mais de 20 OS nunca via nada além da
  primeira página (Edge Case 4 da spec, achado no Gate 3.5 review).
  Corrigido replicando o padrão de `offset` em `useState` +
  Anterior/Próxima já usado em `app/(dashboard)/service-orders/page.tsx`.
  Gotcha adjacente: os botões de paginação da aba ficam dentro do
  `<form>` do modal — sem `type="button"` explícito, cliques neles
  disparariam o submit do formulário inteiro do cliente.

---

## Testing Plan

**Business logic** (`customer.manager.spec.ts`, mocks manuais):
- create/update: os 7 campos novos persistidos corretamente quando
  enviados; omitidos quando não enviados (não sobrescreve com
  `undefined`, mesmo padrão já usado pelos campos opcionais existentes).
- `preferredContactChannel`/`preferredContactTime` fora do enum: rejeição
  acontece no DTO (`@IsIn`), coberto no e2e — o manager não precisa
  validar de novo.

**API/integration** (`customers.e2e-spec.ts`, `service-orders.e2e-spec.ts`):
ver Phase 5, Tasks 14-15 — cobre os 7 campos novos, o filtro
`customer_id`, e o isolamento multi-tenant do filtro novo.

**UI tests** (`CustomerFormModal.test.tsx`):
- Cada aba mostra os campos certos (`CustomerGeneralTab` mostra
  `rg` só quando tipo é PF, `stateRegistration` só quando é PJ).
- Trocar de aba preserva valores já digitados noutra aba (edge case 5
  da spec — testa que o estado do form é compartilhado, não por-aba).
- Aba Histórico desabilitada em modo criação (`customer` undefined);
  habilitada e chamando a API em modo edição.
- Submit em modo criação e edição inclui os 7 campos novos no payload
  quando preenchidos.

---

## Gate 2 Checklist

**Architecture:**
- [x] Segue Controller → Manager → Repository (backend, sem controller
      novo — só DTOs/Manager/Repository dos módulos existentes) e
      `api/hooks/components` (frontend, com subpasta `tabs/` nova).
- [x] Cada camada só chama a de baixo. `ServiceOrderManager` continua
      só falando com `ServiceOrderRepository` — o filtro novo não cria
      nenhuma dependência cruzada com `customers`.
- [x] Componentes nos diretórios corretos
      (`modules/customers/`, `modules/service-orders/`,
      `features/customers/components/tabs/`).

**Task Breakdown:**
- [x] Todos os arquivos a alterar estão listados.
- [x] Todos os arquivos novos estão listados com localização.
- [x] Cada task é pequena (1-3 arquivos, um commit).
- [x] Dependências entre tasks estão claras.
- [x] Paralelo vs sequencial marcado.

**Testing:**
- [x] Testes de camada de dados planejados (via e2e, sem repository
      test dedicado — mesmo padrão de Clientes/Ordem de Serviço, que
      também não têm `*.repository.spec.ts` próprio).
- [x] Testes de lógica de negócio planejados (`customer.manager.spec.ts`).
- [x] Testes de API/integração planejados (2 arquivos e2e).
- [x] Testes de UI planejados (5 abas + troca de aba + histórico
      condicional).
- [x] Edge cases da spec cobertos no plano de teste (6 no total — modo
      criação sem histórico, campos parciais, rg/IE fora do tipo,
      paginação de histórico extenso, troca de aba com erro pendente,
      isolamento multi-tenant do filtro novo).

Gate 2 passou.
