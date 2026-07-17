# Spec: Ordem de Serviço

**Created**: 2026-07-16
**Status**: draft
**Author**: Sergio Oliveira
**Epic**: nucleo-operacional-mvp

---

## Problem

Depois das Features 3 e 4, a oficina sabe quem são seus clientes e quais
veículos eles têm, mas não tem como registrar o trabalho em si: o carro
chega, alguém faz um diagnóstico, conserta, e o cliente busca — e hoje
nada disso fica registrado no sistema. Sem Ordem de Serviço, o produto
para no cadastro e nunca chega no motivo de existir: acompanhar o
atendimento de um veículo do início ao fim. É o último elo da cadeia
vertical Cliente → Veículo → Ordem de Serviço que fecha o MVP.

## Goal

Um usuário abre uma ordem de serviço vinculada a um veículo já
cadastrado (o cliente é derivado automaticamente do dono do veículo),
acompanha e avança o status conforme o trabalho progride (aberta →
em andamento → aguardando peças → concluída → entregue, ou cancelada a
qualquer momento antes da entrega), registra diagnóstico e checklist, e
tem o histórico de mudanças de status auditável. Todos os papéis do
tenant podem operar OS — reflete o fluxo real de oficina, onde tanto a
recepção quanto o mecânico mexem na mesma ordem em etapas diferentes.

## User Stories

- Como Recepção, quando um cliente traz o carro, eu abro uma ordem de
  serviço vinculada ao veículo dele, para o atendimento já começar
  registrado no sistema, mesmo sem um mecânico definido ainda.
- Como Gerente, quando uma OS está pronta pra começar, eu atribuo um
  mecânico responsável, para ficar claro quem está cuidando de cada
  carro.
- Como Mecânico, quando estou trabalhando num veículo, eu preencho o
  diagnóstico, atualizo o checklist e avanço o status da OS (por
  exemplo, de "em andamento" pra "aguardando peças" e de volta), para o
  progresso do meu trabalho ficar visível pra toda a oficina.
- Como Admin, quando preciso saber o histórico de uma OS, eu vejo todas
  as mudanças de status com data e quem mudou, para auditar o
  atendimento se precisar.
- Como Recepção, quando o cliente vem buscar o carro, eu marco a OS como
  "entregue", para fechar o ciclo e saber que aquele atendimento
  terminou.

## Requirements

### Must-have
- `POST /api/v1/service-orders` — cria OS vinculada a um `vehicle_id`
  obrigatório que precisa existir e pertencer ao mesmo tenant; o
  `customer_id` da OS é derivado automaticamente do
  `vehicle.customer_id` (não é informado pelo cliente da API — evita
  inconsistência entre veículo e dono informado à mão); `technician_id`
  opcional; `checklist` (JSONB livre) e `diagnosis` opcionais; status
  inicial sempre `OPEN`; `opened_at` preenchido automaticamente no
  momento da criação.
- `POST /api/v1/service-orders/update` — edita `checklist`, `diagnosis`,
  `technician_id` de uma OS existente do tenant. **Não muda status** —
  transição de status é uma ação separada (ver abaixo), porque toda
  mudança de status precisa gravar uma entrada em
  `service_order_status_history`, e um endpoint de update genérico que
  aceitasse status junto com outros campos tornaria fácil esquecer esse
  registro.
- `POST /api/v1/service-orders/transition` — muda o `status` da OS,
  validando que a transição é permitida pela máquina de estados (ver
  Data Model) e gravando uma linha em `service_order_status_history`
  (`from_status`, `to_status`, `changed_by`, `changed_at`) na mesma
  transação. Transição para `DELIVERED` ou `CANCELLED` preenche
  `closed_at`.
- `POST /api/v1/service-orders/delete` — soft delete; permitido em
  qualquer status; a UI avisa antes de confirmar.
- `GET /api/v1/service-order` — busca uma OS por id (`?id=`), incluindo
  o histórico de status (`status_history`), escopada ao tenant.
- `POST /api/v1/service-orders/list` — lista OS do tenant via
  `offset`/`limit`; suporta filtro por `status`, por `vehicle_id` e por
  `technician_id`; busca textual não faz sentido aqui (não há campo de
  texto livre curto como nome/placa) — fica de fora do MVP.
- Todos os 4 papéis (`ADMIN`, `MANAGER`, `MECHANIC`, `FRONT_DESK`) podem
  criar, editar, transicionar status e excluir OS — sem RBAC diferenciado
  nesta feature (decisão explícita: reflete que tanto recepção quanto
  mecânico mexem na mesma OS em etapas diferentes do fluxo real).
- Validação: `vehicleId` deve corresponder a um veículo existente,
  não soft-deletado, do mesmo tenant — senão erro de validação (400),
  nunca vaza a existência de um veículo de outro tenant.
- `technician_id`, se informado, deve corresponder a um usuário existente
  e ativo do mesmo tenant — senão erro de validação (400).
- DTOs de request/response em `packages/contracts/`, seguindo o padrão
  já usado por `customers`/`vehicles`.
- Migrations Prisma para `service_orders` e `service_order_status_history`,
  seguindo as convenções já em uso.
- Isolamento multi-tenant: adicionar `'ServiceOrder'` a
  `TENANT_SCOPED_MODELS` é obrigatório (mesmo ponto crítico documentado
  nas Features 3 e 4). `ServiceOrderStatusHistory` também precisa entrar
  — é uma tabela filha, mas suas próprias queries (a listagem do
  histórico dentro do `GET /service-order`) passam pelo mesmo Prisma
  Middleware.

### Nice-to-have
- Endpoint `POST /api/v1/service-orders/restore` para reverter soft
  delete (paridade com o padrão de repositório do projeto).
- Contagem de OS abertas por veículo/cliente nas telas de Clientes e
  Veículos (ex: badge "2 OS abertas") — não bloqueia o critério de
  sucesso desta feature, fica pra um polish futuro.

### Out of scope
- Orçamento/valores/preço da OS — módulo de orçamento é um epic pós-MVP
  (ver notas do epic `nucleo-operacional-mvp.md`); esta feature só cobre
  o rastreamento operacional (status, diagnóstico, checklist), sem
  nenhum campo monetário.
- Notificação ao cliente quando o status muda (SMS/e-mail/WhatsApp) —
  integração de comunicação é epic futuro.
- Estrutura fixa de checklist (itens pré-definidos tipo "pneus",
  "freios") — o campo é JSONB livre nesta feature; padronizar o
  conteúdo fica pra quando houver uso real pra basear a decisão.
- RBAC diferenciado por papel dentro de Ordem de Serviço (ex: só o
  técnico atribuído pode transicionar status) — decisão explícita de
  manter todos os 4 papéis com acesso total nesta feature; granularidade
  fica pra depois se virar problema real.
- Anexos/fotos da OS (evidência do problema, do reparo) — mesma decisão
  já tomada em Veículos (campo `photos` só aceita URL, sem upload real).

## Data Model

Convenções: `snake_case`, `TEXT` (nunca `VARCHAR`), `UUID`
(`uuid_generate_v4()`), `TIMESTAMPTZ` em UTC, soft delete (`deleted_at`),
sem foreign keys físicas.

### service_orders
| Coluna | Tipo | Observação |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID | índice |
| customer_id | UUID | índice; derivado do veículo na criação, não editável depois |
| vehicle_id | UUID | índice; FK lógica para `vehicles`, validada na camada de aplicação |
| status | TEXT | ver máquina de estados abaixo |
| checklist | JSONB | nullable, sem schema fixo |
| diagnosis | TEXT | nullable |
| technician_id | UUID | nullable; FK lógica para `users`, validada na camada de aplicação |
| opened_at | TIMESTAMPTZ | preenchido na criação |
| closed_at | TIMESTAMPTZ | nullable; preenchido ao atingir `DELIVERED` ou `CANCELLED` |
| created_at / updated_at / deleted_at | TIMESTAMPTZ | |

### service_order_status_history
| Coluna | Tipo | Observação |
|---|---|---|
| id | UUID PK | |
| service_order_id | UUID | índice |
| from_status | TEXT | nullable (primeira entrada, quando a OS é criada com status `OPEN`) |
| to_status | TEXT | |
| changed_by | UUID | FK lógica para `users` |
| changed_at | TIMESTAMPTZ | |

### Máquina de estados

```
OPEN ──────────────► IN_PROGRESS ──────────────► COMPLETED ──────────────► DELIVERED
                          │      ◄──────────────┘
                          ▼
                    WAITING_PARTS
                          │
                          └──────────────► (volta pra IN_PROGRESS)

CANCELLED: alcançável a partir de OPEN, IN_PROGRESS ou WAITING_PARTS.
DELIVERED e CANCELLED são estados finais — nenhuma transição sai deles.
```

Transições permitidas (`from` → `to`):
- `OPEN` → `IN_PROGRESS`, `CANCELLED`
- `IN_PROGRESS` → `WAITING_PARTS`, `COMPLETED`, `CANCELLED`
- `WAITING_PARTS` → `IN_PROGRESS`, `CANCELLED`
- `COMPLETED` → `DELIVERED`
- `DELIVERED` → (nenhuma — final)
- `CANCELLED` → (nenhuma — final)

Qualquer transição fora dessa lista (incluindo pular etapas, ex: `OPEN` →
`DELIVERED` direto, ou reabrir uma OS `DELIVERED`/`CANCELLED`) retorna
erro de validação (400).

## API Changes

RPC-style: apenas `@Get()`/`@Post()`, query params (nunca path params),
listagem via `POST /service-orders/list` com `{ offset, limit }`. JSON em
`snake_case`, DTOs em `packages/contracts/`.

```
POST /api/v1/service-orders
Auth: ADMIN, MANAGER, FRONT_DESK, MECHANIC
Body: { vehicle_id, technician_id?, checklist?, diagnosis? }
Response 201: { service_order: {...} }
  // customer_id é derivado do veículo, nunca aceito no body

POST /api/v1/service-orders/update
Auth: ADMIN, MANAGER, FRONT_DESK, MECHANIC
Body: { id, technician_id?, checklist?, diagnosis? }
  // status não muda por aqui — ver /transition
Response 200: { service_order: {...} }

POST /api/v1/service-orders/transition
Auth: ADMIN, MANAGER, FRONT_DESK, MECHANIC
Body: { id, to_status }
Response 200: { service_order: {...} }

POST /api/v1/service-orders/delete
Auth: ADMIN, MANAGER, FRONT_DESK, MECHANIC
Body: { id }
Response 200: { service_order: {...} }

GET /api/v1/service-order
Auth: ADMIN, MANAGER, FRONT_DESK, MECHANIC
Query: ?id=<uuid>
Response 200: { service_order: {..., status_history: [...] } }

POST /api/v1/service-orders/list
Auth: ADMIN, MANAGER, FRONT_DESK, MECHANIC
Body: { offset, limit, status?, vehicle_id?, technician_id? }
Response 200: { items: [...], total, offset, limit, has_more }
```

## UI Changes

- Tela "Ordens de Serviço" (nova rota `/service-orders`, dentro do shell
  de dashboard — sidebar ganha o item que hoje está em "Em breve"):
  tabela com veículo (marca/modelo/placa), cliente, técnico, status
  (badge colorido por estado), data de abertura; filtro por status;
  botão "Nova OS".
- Modal de criar OS: seletor de veículo (mesmo padrão de limitação do
  seletor de cliente em Veículos — primeiros 100, sem busca assíncrona
  ainda), seletor de técnico (opcional, lista de usuários do tenant),
  diagnóstico (opcional), checklist fica fora do formulário de criação
  nesta primeira versão (JSONB livre é mais natural de editar na tela de
  detalhe da OS do que num modal de criação rápida).
- Tela de detalhe da OS (`/service-orders/[id]`): mostra todos os dados,
  permite editar diagnóstico/checklist/técnico inline, botões de
  transição de status (só os destinos válidos a partir do status atual
  aparecem como opção — espelha a máquina de estados do backend), e a
  linha do tempo do histórico de status.
- Ação de excluir OS: confirmação com aviso genérico.
- Todos os 4 papéis veem os mesmos botões de ação (sem `canManage`
  diferenciado, ao contrário de Clientes/Veículos) — reflete a decisão
  de RBAC uniforme desta feature.
- Estados a cobrir: loading, lista vazia, erro de validação campo a
  campo, erro genérico de servidor, sucesso, e especificamente pra tela
  de detalhe — o conjunto de transições válidas mudando conforme o
  status atual da OS.

## Edge Cases

1. **Transição de status inválida** — tentar `OPEN` → `DELIVERED`
   direto, ou qualquer transição fora da lista permitida, retorna 400,
   sem persistir mudança nem gravar histórico.
2. **Transicionar uma OS já em estado final** — tentar mudar o status de
   uma OS `DELIVERED` ou `CANCELLED` retorna 400 (nenhuma transição sai
   de um estado final).
3. **`vehicle_id` inexistente ou de outro tenant** — retorna erro de
   validação (400), nunca vaza a existência do veículo de outro tenant
   (mesmo padrão de `customer_id` em Veículos).
4. **`technician_id` inexistente, de outro tenant, ou desabilitado** —
   retorna erro de validação (400).
5. **Corrida entre duas transições simultâneas na mesma OS** — duas
   requisições tentando transicionar a mesma OS ao mesmo tempo (ex:
   ambas partindo de `IN_PROGRESS`) não podem resultar em duas entradas
   de histórico conflitantes nem num estado inconsistente; a segunda
   transição deve falhar de forma limpa (revalidar o status atual dentro
   da transação, não confiar no valor lido antes de escrever).
6. **Excluir veículo com OS aberta vinculada** — soft delete do veículo
   (Feature 4) não é bloqueado pela existência de uma OS; a OS mantém a
   referência ao `vehicle_id` mesmo depois, preservando histórico (já
   coberto pela decisão da Feature 4, reafirmado aqui).
7. **Buscar/transicionar/excluir OS de outro tenant via manipulação de
   id** — o Prisma Middleware deve retornar "não encontrado", nunca
   vazar dado de outro tenant; coberto pelo mesmo padrão de teste de
   isolamento já usado em Clientes e Veículos.
8. **`checklist` com JSON malformado ou não-objeto** — rejeitado na
   validação do DTO antes do Manager.

## Testing Criteria

**Happy path:**
- Criar OS com `vehicle_id` válido retorna 201 com `customer_id`
  corretamente derivado do veículo.
- Transicionar `OPEN` → `IN_PROGRESS` → `WAITING_PARTS` → `IN_PROGRESS`
  → `COMPLETED` → `DELIVERED` funciona em sequência, cada transição
  gravando uma entrada em `service_order_status_history`.
- `closed_at` é preenchido só ao atingir `DELIVERED` ou `CANCELLED`.
- `GET /service-order` retorna a OS com o histórico completo de status.
- Listar por `status`/`vehicle_id`/`technician_id` filtra corretamente.
- Excluir OS marca `deleted_at` e ela some da listagem padrão.

**Edge cases:**
- Transição inválida (pular etapa, sair de estado final) retorna 400 e
  não grava histórico nem muda o status.
- `vehicle_id`/`technician_id` inexistente ou de outro tenant retorna
  400.
- Teste de corrida: duas transições concorrentes na mesma OS — a
  segunda falha de forma limpa (não duplica histórico, não deixa OS em
  estado inconsistente).
- Teste de isolamento multi-tenant: OS do tenant A nunca aparece em
  get/list/transition/delete feitos autenticado como tenant B.
- `checklist` malformado retorna 400.

## Dependencies

- Feature 1 (Setup Monorepo & Infra Base) — concluída.
- Feature 2 (IAM: Tenant, Auth, RBAC) — concluída.
- Feature 3 (Clientes) — concluída; `service_orders.customer_id` é
  derivado de `vehicles.customer_id`, que por sua vez referencia
  `customers`.
- Feature 4 (Veículos) — concluída; `service_orders.vehicle_id`
  referencia `vehicles`, validado via `VehicleRepository`.
