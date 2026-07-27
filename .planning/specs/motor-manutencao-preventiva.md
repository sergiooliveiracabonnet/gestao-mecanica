# Spec: Motor de Manutenção Preventiva

**Created**: 2026-07-26
**Status**: draft
**Author**: Sergio Oliveira
**Epic**: crm-avancado-cliente-manutencao-preventiva (Feature 7)

---

## Problem

A oficina não tem nenhum jeito, hoje, de saber proativamente quais
veículos estão devendo revisão. A informação existe (a última Ordem de
Serviço entregue de cada veículo), mas ninguém teria tempo de revisar
manualmente todo o cadastro de clientes/veículos pra descobrir quem
está há 6+ meses sem manutenção — então isso simplesmente não acontece,
e a oficina perde oportunidade de receita recorrente e o cliente perde
lembrete de manutenção preventiva.

## Goal

Um job agendado recalcula diariamente, pra cada veículo de cada tenant,
se ele está "devendo revisão" (6+ meses desde a referência de
manutenção — ver Data Model) e mantém um alerta interno correspondente.
Um painel dentro do ERP lista esses alertas pra todos os papéis do
tenant, que podem marcar um alerta como resolvido manualmente (ex: já
ligaram pro cliente). Nenhum disparo externo (e-mail/WhatsApp/SMS) —
só visibilidade dentro do sistema.

## User Stories

- Como Recepção, eu abro o painel de alertas de manutenção e vejo a
  lista de veículos devendo revisão há 6+ meses, para eu saber quem
  ligar hoje.
- Como Gerente, eu marco um alerta como resolvido depois de contatar o
  cliente, para ele sair da lista ativa até o próximo ciclo de
  manutenção.
- Como Mecânico, eu também posso ver o painel de alertas, para ter
  contexto de quais clientes recorrentes podem estar chegando em breve.
- Como Admin, o sistema recalcula os alertas automaticamente todo dia,
  para eu não depender de ninguém lembrar de rodar nada manualmente.

## Requirements

### Must-have

- Job repetível (BullMQ, mesmo padrão da Feature FIPE) que roda 1x por
  dia e recalcula, pra cada veículo (de todos os tenants), se ele está
  devendo revisão.
- **Referência de manutenção por veículo**: `closedAt` da última
  `ServiceOrder` com `status = DELIVERED` daquele veículo; se o veículo
  nunca teve nenhuma OS `DELIVERED`, usa `Vehicle.createdAt` como
  referência (ponto zero).
- Veículo é considerado "devendo revisão" quando `now() - referência >=
  6 meses`. Limiar fixo no código (não configurável por tenant nesta
  feature).
- Nova tabela `maintenance_alerts`, com no máximo **um alerta por
  combinação (veículo, referência)** — evita duplicar alerta pro mesmo
  ciclo de manutenção em execuções diárias sucessivas do job (ver Data
  Model).
- `POST /api/v1/maintenance-alerts/list` — lista alertas do tenant via
  `offset`/`limit`; filtro por `status` (default: só `OPEN`); ordenado
  por referência mais antiga primeiro (quem está devendo há mais tempo
  aparece no topo).
- `POST /api/v1/maintenance-alerts/resolve` — marca um alerta como
  `RESOLVED`, gravando `resolvedAt` e `resolvedBy` (usuário autenticado
  atual); idempotente (resolver um alerta já resolvido não é erro).
- Quando uma OS de um veículo transiciona para `DELIVERED`, qualquer
  alerta `OPEN` daquele veículo com referência antiga (anterior a esse
  `closedAt`) fica obsoleto — o próximo ciclo do job já não o recria
  (referência mudou), então ele deve ser marcado como resolvido
  automaticamente na própria transição (evita o alerta antigo continuar
  aparecendo como "ativo" até o próximo job noturno rodar).
- Painel `/maintenance-alerts` no frontend, acessível a todos os papéis
  do tenant (Admin, Gerente, Mecânico, Recepção), com item de navegação
  na sidebar.
- Cada linha do painel mostra: veículo (marca/modelo/placa), cliente
  (nome, com link pro cadastro), há quanto tempo está devendo (meses),
  e botão "Marcar como resolvido".

### Nice-to-have

- Contador/badge na sidebar com o número de alertas `OPEN` do tenant.
- Ordenar/filtrar o painel por cliente ou por veículo.

### Out of scope

- Disparo automático de e-mail/WhatsApp/SMS pro cliente — decisão
  explícita da epic, fica pra uma epic futura de notificações externas.
- Limiar de 6 meses configurável por tenant — fixo no código nesta
  feature.
- Alertas para veículos soft-deletados ou de clientes soft-deletados —
  o job ignora esses veículos (mesmo padrão de `deletedAt.isNull()` já
  usado em toda a base).
- Reabrir um alerta já resolvido manualmente antes do próximo ciclo (ou
  seja, antes de uma nova OS `DELIVERED` mudar a referência) — uma vez
  resolvido, fica resolvido até o ciclo seguinte.

## Data Model

Nova tabela `maintenance_alerts`, tenant-scoped (mesmo padrão de
`Customer`/`Vehicle`/`ServiceOrder` — entra em `TENANT_SCOPED_MODELS`
na extensão Prisma de isolamento).

| Coluna | Tipo | Observação |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | injetado pela extensão Prisma (via `TenantContextService.run()` no job — ver Dependencies) |
| vehicle_id | UUID | FK lógica pra `vehicles`, nunca constraint física |
| customer_id | UUID | derivado de `vehicle.customerId` no momento da criação do alerta, mesmo padrão já usado em `ServiceOrder.customerId` — evita join extra pra listar/exibir |
| reference_date | TIMESTAMPTZ | data usada como "ponto zero" do ciclo (último `closedAt` de OS `DELIVERED`, ou `vehicle.createdAt` se nunca houve) |
| status | TEXT | `OPEN` \| `RESOLVED` |
| resolved_at | TIMESTAMPTZ | nullable |
| resolved_by | UUID | nullable; FK lógica pra `users` |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | nullable |

`@@unique([vehicleId, referenceDate])` — garante no máximo um alerta
por ciclo de manutenção de cada veículo; o job faz
find-or-create-by-esses-dois-campos em vez de sempre inserir.

Sem `deleted_at`: alertas nunca são apagados pelo usuário, só resolvidos
(campo `status`). Não há endpoint de delete nesta feature.

`@@index([tenantId, status])` — a query principal do painel filtra por
tenant + status `OPEN`.

## API Changes

RPC-style, mesmo padrão das Features 3-6. JSON em `snake_case`.

```
POST /api/v1/maintenance-alerts/list
Auth: ADMIN, MANAGER, FRONT_DESK, MECHANIC
Body: { offset, limit, status? }  // status default: "OPEN"
Response 200: {
  items: [{
    id, vehicle: { id, brand, model, plate },
    customer: { id, name },
    reference_date, months_overdue, status, resolved_at
  }, ...],
  total, offset, limit, has_more
}

POST /api/v1/maintenance-alerts/resolve
Auth: ADMIN, MANAGER, FRONT_DESK, MECHANIC
Body: { id }
Response 200: { alert: { id, status: "RESOLVED", resolved_at, resolved_by } }
```

Não há `POST /api/v1/maintenance-alerts` (create) nem `/update` — as
linhas só são criadas pelo job interno, nunca pela API pública.

## UI Changes

- Nova rota `frontend/app/(dashboard)/maintenance-alerts/page.tsx`.
- Novo item de navegação na `sidebar.tsx`: "Alertas de Manutenção"
  (ícone `Bell` ou `Wrench`, a definir no plan), entre "Ordens de
  Serviço" e "Usuários".
- Tabela reaproveitando o padrão visual já usado em
  `ServiceOrdersTable`/`CustomersTable` (mesma paginação
  `offset`/`limit`).
- Estado vazio: "Nenhum veículo devendo revisão no momento" quando não
  há alertas `OPEN`.
- Botão "Marcar como resolvido" com confirmação leve (não precisa de
  modal, um `toast` de undo é suficiente) e atualização otimista da
  lista (remove a linha imediatamente, sem esperar refetch completo —
  mesmo padrão de `FRONTEND.md` § Optimistic Updates).
- Coluna "há quanto tempo": calculada no frontend a partir de
  `reference_date` (ex: "7 meses"), não precisa vir pronta do backend
  além do `reference_date` bruto (backend já retorna `months_overdue`
  calculado pra evitar lógica de data duplicada entre BE/FE — ver API
  Changes).

## Edge Cases

1. **Veículo nunca teve OS `DELIVERED`** — usa `vehicle.createdAt`
   como referência; se o cadastro tem 6+ meses, entra no alerta mesmo
   sem histórico de manutenção nenhum.
2. **Job roda duas vezes seguidas sem nada mudar** — segunda execução
   não duplica alerta (unique constraint em `vehicleId +
   referenceDate`); é um no-op idempotente.
3. **Alerta resolvido manualmente, veículo continua sem nova OS
   `DELIVERED`** — o alerta permanece `RESOLVED` nas execuções
   seguintes do job (mesma `referenceDate`), não reaparece sozinho até
   o cliente trazer o carro de novo e uma nova OS ser entregue.
4. **Nova OS `DELIVERED` enquanto havia um alerta `OPEN` daquele
   veículo** — a transição da OS resolve automaticamente o alerta
   antigo (referência mudou); o próximo ciclo de 6 meses só conta a
   partir do novo `closedAt`.
5. **Veículo ou cliente soft-deletado** — job ignora (filtra
   `deletedAt.isNull()` em ambos), não gera nem mantém alerta ativo
   pra dado soft-deletado.
6. **Tenant sem nenhum veículo** — job passa por ele sem erro, sem
   gerar alertas.
7. **Volume alto de veículos** — job processa em chunks paginados
   (padrão `BATCH_PROCESSING.md`: `CHUNK_SIZE`/`MAX_CHUNKS` nomeados),
   nunca carrega todos os veículos de todos os tenants de uma vez em
   memória.
8. **Resolver um alerta já resolvido** (duplo clique, ou duas abas
   abertas) — endpoint idempotente, retorna sucesso sem erro, não
   sobrescreve `resolvedAt`/`resolvedBy` da primeira resolução.
9. **`id` de alerta de outro tenant no `resolve`** — mesmo padrão de
   isolamento das demais features: retorna 404, nunca vaza nem deixa
   resolver alerta de outro tenant.

## Testing Criteria

**Happy path:**
- Veículo com última OS `DELIVERED` há 7 meses aparece no painel; um
  com última OS `DELIVERED` há 3 meses não aparece.
- Veículo sem nenhuma OS `DELIVERED`, cadastrado há 8 meses, aparece no
  painel usando `createdAt` como referência.
- Marcar um alerta como resolvido remove ele da lista padrão (`status
  = OPEN`) imediatamente na UI.
- Rodar o job duas vezes seguidas não duplica alertas.

**Edge cases:**
- Nova OS `DELIVERED` resolve automaticamente o alerta `OPEN`
  existente daquele veículo.
- Alerta resolvido manualmente não reaparece até uma nova OS
  `DELIVERED` mudar a referência daquele veículo.
- Veículo/cliente soft-deletado nunca gera ou mantém alerta.
- Isolamento entre tenants: `list` e `resolve` nunca vazam ou afetam
  dado de outro tenant (teste e2e).
- Job processa corretamente um tenant com volume alto de veículos, em
  chunks, sem estourar memória (teste com `CHUNK_SIZE` pequeno pra
  validar o loop sem precisar de milhares de registros reais).

## Dependencies

- Feature 4 (Veículos) — concluída; usa `Vehicle.createdAt` e
  `Vehicle.customerId`.
- Feature 5 (Ordem de Serviço) — concluída; usa `ServiceOrder.status`
  e `closedAt`, e precisa de um hook na transição pra `DELIVERED`
  (`ServiceOrderManager`/state machine) pra resolver alertas obsoletos.
- Feature FIPE (Integração FIPE) — não é dependência funcional, mas é
  a referência de implementação: primeiro (e até agora único) job
  BullMQ repetível do projeto (`fipe.module.ts`), incluindo o padrão de
  pular agendamento em `NODE_ENV=test` e o cron fixo em horário parado.
- `TenantContextService` (`shared/tenant-context/`) — o job precisa
  iterar todos os tenants e rodar o processamento de cada um dentro de
  `tenantContext.run({...}, ...)`, porque `Vehicle`/`ServiceOrder`/
  `MaintenanceAlert` são tenant-scoped e dependem do contexto
  ativo (`AsyncLocalStorage`) pra terem `tenant_id` injetado
  automaticamente pela extensão Prisma — sem isso, `create` desses
  models falha silenciosamente sem o filtro ou (pior) grava sem
  `tenant_id`.
