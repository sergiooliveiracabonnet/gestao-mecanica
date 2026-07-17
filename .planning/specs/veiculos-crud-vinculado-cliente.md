# Spec: Veículos (CRUD vinculado a Cliente)

**Created**: 2026-07-16
**Status**: draft
**Author**: Sergio Oliveira
**Epic**: nucleo-operacional-mvp

---

## Problem

Depois da Feature 3 (Clientes), o sistema sabe quem são os clientes da
oficina, mas não sabe quais veículos eles possuem. Sem cadastro de
veículos não existe em cima do que abrir uma ordem de serviço (Feature 5)
— Veículos é o elo que faltava na cadeia Cliente → Veículo → Ordem de
Serviço, e sem ele a oficina não consegue registrar o histórico de
atendimento de um carro específico ao longo do tempo.

## Goal

Um usuário autorizado cadastra um veículo vinculado a um cliente já
existente da própria oficina, edita os dados quando mudam (ex: nova
quilometragem, troca de motor), busca/lista os veículos cadastrados —
inclusive filtrando pelos veículos de um cliente específico — e remove um
veículo que não é mais atendido. Tudo isolado por tenant, com o mesmo
rigor de segurança multi-tenant já validado nas Features 2 e 3.

## User Stories

- Como Recepção, quando um cliente chega com um carro novo, eu cadastro
  marca, modelo e placa rapidamente vinculando ao cliente já cadastrado,
  para eu poder abrir uma ordem de serviço para esse veículo.
- Como Gerente, quando os dados de um veículo mudam (nova quilometragem,
  troca de motor), eu edito o cadastro existente, para o histórico ficar
  atualizado.
- Como Admin, quando abro o cadastro de um cliente, eu vejo a lista de
  veículos vinculados a ele, para entender rapidamente o histórico de
  carros daquele cliente sem precisar buscar veículo por veículo.
- Como Mecânico, quando estou trabalhando numa ordem de serviço, eu vejo
  os dados do veículo (marca, modelo, ano, motor, quilometragem), para
  confirmar informações técnicas — mas eu não crio, edito nem excluo
  veículos.
- Como Gerente, quando um veículo para de ser atendido pela oficina
  (cliente vendeu o carro, por exemplo), eu removo o cadastro, mas o
  histórico de ordens de serviço antigas daquele veículo continua
  intacto.

## Requirements

### Must-have
- `POST /api/v1/vehicles` — cria veículo no tenant do usuário autenticado,
  vinculado a um `customer_id` obrigatório que precisa existir e
  pertencer ao mesmo tenant (senão 404/400, ver Edge Cases); valida placa
  única **por tenant** (não globalmente — o mesmo veículo pode ter
  passado por oficinas diferentes ao longo do tempo, ex: troca de dono).
- `POST /api/v1/vehicles/update` — edita um veículo existente do próprio
  tenant; `customer_id` não é editável nesta feature (trocar o dono de um
  veículo cadastrado é um caso raro o suficiente para ficar fora do MVP —
  se acontecer, excluir e recriar).
- `POST /api/v1/vehicles/delete` — soft delete; permitido mesmo com
  ordens de serviço vinculadas (quando Feature 5 existir) — histórico
  permanece intacto; a UI avisa antes de confirmar.
- `GET /api/v1/vehicle` — busca um veículo por id (`?id=`), escopado ao
  tenant do requisitante.
- `POST /api/v1/vehicles/list` — lista veículos do tenant via
  `offset`/`limit`; suporta busca textual por marca/modelo/placa
  (`search`) e filtro opcional por `customer_id` (para a tela de detalhe
  do cliente mostrar só os veículos dele).
- Papéis autorizados a criar/editar/excluir: `ADMIN`, `MANAGER`,
  `FRONT_DESK` — mesmo padrão da Feature 3. `MECHANIC` tem acesso
  somente leitura (`GET`/`list`).
- Validação de campos: `customerId`, `brand`, `model`, `plate`
  obrigatórios; `year`, `engine`, `fuelType`, `chassis`, `mileage`,
  `photos` opcionais.
- `customerId` informado deve corresponder a um cliente existente e não
  soft-deletado do mesmo tenant — senão erro de validação (400), não 500.
- `photos` aceita uma lista de URLs (strings) — **sem upload de arquivo
  real nesta feature**; o campo existe no schema para as próximas
  iterações plugarem um provedor de storage sem precisar de migration
  nova.
- DTOs de request/response em `packages/contracts/`, seguindo o padrão já
  usado por `customers` (interfaces em `request/`/`response/`, classes
  `class-validator` no backend implementando essas interfaces).
- Migration Prisma para `vehicles`, seguindo as convenções já em uso
  (`createdAt`/`updatedAt`/`deletedAt`, sem FK física, índices em
  `tenant_id` e `customer_id`).
- Isolamento multi-tenant garantido pelo `TenantContextGuard` + Prisma
  Middleware já existentes — adicionar `'Vehicle'` a
  `TENANT_SCOPED_MODELS` é obrigatório (mesmo ponto crítico documentado
  na Feature 3).
- Endpoints protegidos por `JwtAuthGuard` (herdado globalmente) e
  `RolesGuard` com `@Roles(...)`.

### Nice-to-have
- Endpoint `POST /api/v1/vehicles/restore` para reverter soft delete
  (paridade com o padrão de repositório do projeto, não bloqueia o
  critério de sucesso desta feature).
- Seção "Veículos" dentro da tela de detalhe do cliente (se/quando essa
  tela existir) usando o filtro `customer_id` do `list`.

### Out of scope
- Upload/armazenamento real de fotos (S3 ou similar) — só o campo
  `photos: string[]` aceitando URLs; a infraestrutura de upload fica para
  uma iteração futura.
- Ordem de Serviço — Feature 5, depende desta.
- Troca de dono de um veículo já cadastrado (editar `customerId`) — fora
  do MVP, ver justificativa em Must-have.
- Validação de formato de placa (padrão Mercosul vs. antigo) — aceita
  qualquer texto não vazio; validação de formato fica para depois se
  virar problema real.
- Histórico de alterações do cadastro do veículo — só o `audit_logs`
  genérico já existente, sem tela dedicada.
- Tela de detalhe do cliente mostrando a lista de veículos — a spec cobre
  o filtro por `customer_id` no backend (`list`), mas a UI dedicada fica
  como nice-to-have; o MVP desta feature é a tela `/vehicles` própria,
  espelhando `/customers`.

## Data Model

Convenções: `snake_case`, `TEXT` (nunca `VARCHAR`), `UUID`
(`uuid_generate_v4()`), `TIMESTAMPTZ` em UTC, soft delete (`deleted_at`),
sem foreign keys físicas.

### vehicles
| Coluna | Tipo | Observação |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID | índice |
| customer_id | UUID | índice; FK lógica para `customers`, validada na camada de aplicação |
| brand | TEXT | |
| model | TEXT | |
| year | INTEGER | nullable |
| engine | TEXT | nullable |
| fuel_type | TEXT | nullable |
| plate | TEXT | único por tenant (índice único parcial `WHERE deleted_at IS NULL`) |
| chassis | TEXT | nullable |
| mileage | INTEGER | nullable |
| photos | TEXT[] | URLs, nullable/vazio por padrão |
| created_at / updated_at / deleted_at | TIMESTAMPTZ | |

Já esboçado em
`docs/superpowers/specs/2026-07-14-arquitetura-mvp-design.md` seção 5 —
esta spec adiciona a decisão de unicidade de placa por tenant e os campos
obrigatórios/opcionais.

## API Changes

RPC-style: apenas `@Get()`/`@Post()`, query params (nunca path params),
listagem via `POST /vehicles/list` com `{ offset, limit }`. JSON em
`snake_case`, DTOs em `packages/contracts/`.

```
POST /api/v1/vehicles
Auth: ADMIN, MANAGER, FRONT_DESK
Body: { customer_id, brand, model, plate, year?, engine?, fuel_type?, chassis?, mileage?, photos? }
Response 201: { vehicle: {...} }

POST /api/v1/vehicles/update
Auth: ADMIN, MANAGER, FRONT_DESK
Body: { id, brand?, model?, year?, engine?, fuel_type?, plate?, chassis?, mileage?, photos? }
  // customer_id não é editável — se enviado, é rejeitado (whitelist do DTO)
Response 200: { vehicle: {...} }

POST /api/v1/vehicles/delete
Auth: ADMIN, MANAGER, FRONT_DESK
Body: { id }
Response 200: { vehicle: {...} }

GET /api/v1/vehicle
Auth: ADMIN, MANAGER, FRONT_DESK, MECHANIC
Query: ?id=<uuid>
Response 200: { vehicle: {...} }

POST /api/v1/vehicles/list
Auth: ADMIN, MANAGER, FRONT_DESK, MECHANIC
Body: { offset, limit, search?, customer_id? }
Response 200: { items: [...], total, offset, limit, has_more }
```

## UI Changes

- Tela "Veículos" (nova rota `/vehicles`, dentro do shell de dashboard —
  sidebar ganha o item "Veículos" que hoje está em "Em breve"): tabela
  com marca, modelo, placa, cliente dono; campo de busca; botão "Novo
  veículo".
- Modal/formulário de criar veículo: seletor de cliente (busca/autocomplete
  entre os clientes do tenant — reaproveita `customers/list`), marca,
  modelo, placa, e os campos opcionais (ano, motor, combustível, chassi,
  quilometragem). Fotos ficam fora do formulário nesta feature (campo
  existe na API mas sem UI de upload ainda).
- Ação de editar veículo reaproveita o mesmo formulário, pré-preenchido,
  sem o seletor de cliente (não editável).
- Ação de excluir veículo: confirmação com aviso quando houver ordens de
  serviço vinculadas (texto genérico, mesmo padrão de Clientes).
- `MECHANIC` vê a tela em modo somente leitura (sem botões de criar/
  editar/excluir), espelhando o `RolesGuard` do backend.
- Estados a cobrir: loading, lista vazia, erro de validação campo a
  campo, erro genérico de servidor, sucesso.

## Edge Cases

1. **Placa duplicada no mesmo tenant** — criar veículo com placa já
   cadastrada (e não soft-deletada) no tenant retorna erro de validação
   (409), não 500. Placa pode repetir entre tenants diferentes.
2. **`customer_id` inexistente ou de outro tenant** — signup com
   `customer_id` que não existe, está soft-deletado, ou pertence a outro
   tenant retorna erro de validação (400), nunca vaza a existência do
   cliente de outro tenant nem cria o veículo "órfão".
3. **Mecânico tentando criar/editar/excluir** — `RolesGuard` bloqueia com
   403; a UI nem mostra os botões, mas o backend é a fonte de verdade.
4. **Excluir veículo com ordens de serviço vinculadas** — soft delete é
   permitido; registros vinculados (Feature 5, quando existir) mantêm a
   referência ao `vehicle_id` mesmo após o soft delete, preservando
   histórico.
5. **Buscar/editar/excluir veículo de outro tenant via manipulação de id**
   — o Prisma Middleware deve retornar "não encontrado", nunca vazar
   dado de outro tenant; coberto pelo mesmo padrão de teste de isolamento
   já usado em Clientes.
6. **Reativar veículo soft-deletado criando outro com a mesma placa** —
   como o índice único é parcial (`WHERE deleted_at IS NULL`), um novo
   cadastro com a mesma placa é permitido depois do soft delete.
7. **Tentar editar `customer_id`** — o campo não existe em
   `UpdateVehicleDto`; se enviado, é rejeitado pelo
   `forbidNonWhitelisted` do `ValidationPipe` global (400), não
   silenciosamente ignorado.
8. **Marca, modelo ou placa vazios/só espaços** — rejeitado na validação
   do DTO (`class-validator`), antes do Manager.

## Testing Criteria

**Happy path:**
- Criar veículo com dados válidos e `customer_id` existente retorna 201
  com o veículo criado.
- Editar veículo atualiza os campos permitidos; `customer_id` continua
  inalterado mesmo se enviado no body (rejeitado, não silenciosamente
  ignorado — ver Edge Case 7).
- Listar veículos retorna apenas os do tenant do requisitante, respeitando
  `offset`/`limit`; filtro por `customer_id` retorna só os veículos
  daquele cliente.
- Buscar por marca/modelo/placa parcial retorna os veículos esperados.
- Excluir veículo marca `deleted_at` e ele some da listagem padrão.

**Edge cases:**
- Placa duplicada no mesmo tenant retorna 409.
- `customer_id` inexistente ou de outro tenant retorna 400 (não 500, não
  vaza dado do outro tenant).
- Mesma placa em dois tenants diferentes: ambos criam com sucesso.
- `MECHANIC` recebe 403 em create/update/delete, 200 em get/list.
- Teste de isolamento multi-tenant: veículo do tenant A nunca aparece em
  get/list/update/delete feitos autenticado como tenant B.
- Enviar `customer_id` no body de `update` retorna 400 (campo não existe
  no DTO).
- Soft delete + recriação com mesma placa funciona sem erro.

## Dependencies

- Feature 1 (Setup Monorepo & Infra Base) — concluída.
- Feature 2 (IAM: Tenant, Auth, RBAC) — concluída.
- Feature 3 (Clientes CRUD PF/PJ) — concluída; `vehicles.customer_id`
  depende de `customers` existir e reusa o padrão de repositório/manager/
  controller estabelecido lá.
