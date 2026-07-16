# Spec: Clientes (CRUD PF/PJ)

**Created**: 2026-07-16
**Status**: draft
**Author**: Sergio Oliveira
**Epic**: nucleo-operacional-mvp

---

## Problem

Depois da Feature 2 (IAM), o sistema autentica usuários e isola dados por
tenant, mas nenhuma oficina consegue registrar quem são seus clientes. Sem
cadastro de clientes não existe em cima do que vincular veículos (Feature 4)
nem abrir ordens de serviço (Feature 5) — Clientes é o próximo elo da cadeia
vertical Cliente → Veículo → Ordem de Serviço que faz o produto ser usável de
ponta a ponta.

## Goal

Um usuário autorizado (Admin, Gerente ou Recepção) cadastra um cliente
(pessoa física ou jurídica) da própria oficina em segundos, edita os dados
quando mudam, busca/lista os clientes já cadastrados, e pode remover um
cliente que não é mais atendido — tudo isolado por tenant, com o mesmo rigor
de segurança multi-tenant validado na Feature 2.

## User Stories

- Como Recepção, quando um cliente novo chega na oficina, eu cadastro nome,
  documento (CPF/CNPJ) e telefone rapidamente, para eu poder já vincular um
  veículo e abrir uma ordem de serviço para ele.
- Como Gerente, quando os dados de contato de um cliente mudam (telefone,
  endereço), eu edito o cadastro existente, para as próximas comunicações
  chegarem certas.
- Como Admin, quando preciso encontrar um cliente específico, eu busco por
  nome ou documento na lista, para não precisar rolar por todos os
  cadastrados.
- Como Mecânico, quando estou numa ordem de serviço, eu vejo os dados do
  cliente dono do veículo, para eu poder confirmar informações se precisar —
  mas eu não crio, edito nem excluo clientes.
- Como Gerente, quando um cliente para de ser atendido pela oficina, eu removo
  o cadastro dele, mas o histórico de ordens de serviço antigas continua
  intacto, para eu manter a base de clientes ativa organizada sem perder
  registro do que já foi feito.

## Requirements

### Must-have
- `POST /api/v1/customers` — cria cliente (PF ou PJ) no tenant do usuário
  autenticado; valida CPF/CNPJ por dígito verificador (reusa
  `DocumentValidatorService` da Feature 2); documento único **por tenant**
  (não globalmente — a mesma pessoa pode ser cliente de oficinas diferentes).
- `POST /api/v1/customers/update` — edita um cliente existente do próprio
  tenant.
- `POST /api/v1/customers/delete` — soft delete; permitido mesmo com
  veículos/ordens de serviço vinculados (histórico permanece intacto); a UI
  avisa antes de confirmar quando houver vínculos.
- `GET /api/v1/customer` — busca um cliente por id (`?id=`), escopado ao
  tenant do requisitante.
- `POST /api/v1/customers/list` — lista clientes do tenant via
  `offset`/`limit`; suporta busca textual por nome ou documento (`search`).
- Papéis autorizados a criar/editar/excluir: `ADMIN`, `MANAGER`,
  `FRONT_DESK`. `MECHANIC` tem acesso somente leitura (`GET`/`list`).
- Validação de campos: `name` e `document` obrigatórios; `type` (`PF`/`PJ`)
  obrigatório; `phone` obrigatório; `email` opcional; `address` opcional
  (JSONB).
- DTOs de request/response em `packages/contracts/`, seguindo o padrão já
  usado por `auth`/`users` (interfaces em `request/`/`response/`, classes
  `class-validator` no backend implementando essas interfaces).
- Migration Prisma para `customers`, seguindo exatamente as convenções já em
  uso (`SoftDeleteTable`-equivalent no Prisma: `createdAt`/`updatedAt`/
  `deletedAt`, sem FK física, índice em `tenant_id`).
- Isolamento multi-tenant garantido pelo `TenantContextGuard` + Prisma
  Middleware já existentes (Feature 2) — nenhum código novo de isolamento,
  só reuso.
- Endpoints protegidos por `JwtAuthGuard` (herdado globalmente) e
  `RolesGuard` com `@Roles(...)`.

### Nice-to-have
- Endpoint `POST /api/v1/customers/restore` para reverter soft delete
  (paridade com o padrão de repositório do projeto, mas não bloqueia o
  critério de sucesso desta feature).
- Contagem de veículos/OS vinculados retornada junto no `GET /customer`
  (para a UI decidir o texto do aviso de exclusão) — se não couber no tempo,
  a UI pode mostrar um aviso genérico sem o número exato.

### Out of scope
- CRUD de Veículos — Feature 4, depende desta.
- Ordem de Serviço — Feature 5, depende desta e da Feature 4.
- Importação em lote de clientes (CSV/planilha) — não faz parte do MVP.
- Histórico de alterações do cadastro do cliente (quem mudou o quê) — só o
  `audit_logs` genérico já existente da Feature 2, sem tela dedicada.
- Anexos/documentos do cliente (contrato, RG digitalizado etc.) — fora do
  MVP.

## Data Model

Convenções: `snake_case`, `TEXT` (nunca `VARCHAR`), `UUID`
(`uuid_generate_v4()`), `TIMESTAMPTZ` em UTC, soft delete (`deleted_at`),
sem foreign keys físicas.

### customers
| Coluna | Tipo | Observação |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID | índice |
| type | TEXT | `PF` / `PJ` |
| document | TEXT | CPF ou CNPJ, único por tenant (índice único parcial `WHERE deleted_at IS NULL`, mesmo padrão de `tenants.document`) |
| name | TEXT | |
| email | TEXT | nullable |
| phone | TEXT | |
| address | JSONB | nullable |
| notes | TEXT | nullable |
| created_at / updated_at / deleted_at | TIMESTAMPTZ | |

Já definido em `docs/superpowers/specs/2026-07-14-arquitetura-mvp-design.md`
seção 5 — esta spec só adiciona a decisão de unicidade por tenant (documento)
e os campos obrigatórios/opcionais.

## API Changes

RPC-style: apenas `@Get()`/`@Post()`, query params (nunca path params),
listagem via `POST /customers/list` com `{ offset, limit }`. JSON em
`snake_case`, DTOs em `packages/contracts/`.

```
POST /api/v1/customers
Auth: ADMIN, MANAGER, FRONT_DESK
Body: { type, document, name, phone, email?, address?, notes? }
Response 201: { customer: {...} }

POST /api/v1/customers/update
Auth: ADMIN, MANAGER, FRONT_DESK
Body: { id, name?, phone?, email?, address?, notes? }
  // document e type não são editáveis após criação (identidade do cliente);
  // se estiverem errados, excluir e recriar.
Response 200: { customer: {...} }

POST /api/v1/customers/delete
Auth: ADMIN, MANAGER, FRONT_DESK
Body: { id }
Response 200: { customer: {...} }  // soft-deleted, deleted_at preenchido

GET /api/v1/customer
Auth: ADMIN, MANAGER, FRONT_DESK, MECHANIC
Query: ?id=<uuid>
Response 200: { customer: {...} }

POST /api/v1/customers/list
Auth: ADMIN, MANAGER, FRONT_DESK, MECHANIC
Body: { offset, limit, search? }  // search casa contra name OU document
Response 200: { items: [...], total, offset, limit, has_more }
```

## UI Changes

- Tela "Clientes" (nova rota `/customers`, no mesmo layout autenticado de
  `/users`): tabela com nome, documento, telefone, tipo (PF/PJ); campo de
  busca; botão "Novo cliente".
- Modal/formulário de criar cliente: tipo (PF/PJ), nome, documento
  (com máscara CPF/CNPJ conforme o tipo), telefone, e-mail (opcional),
  endereço (opcional), notas (opcional).
- Ação de editar cliente reaproveita o mesmo formulário, pré-preenchido,
  sem os campos `type`/`document` editáveis.
- Ação de excluir cliente: confirmação com aviso quando houver
  veículos/OS vinculados (texto genérico se a contagem exata não estiver
  disponível — ver Nice-to-have).
- `MECHANIC` vê a tela em modo somente leitura (sem botões de criar/editar/
  excluir), espelhando o `RolesGuard` do backend.
- Estados a cobrir: loading, lista vazia (nenhum cliente cadastrado ainda),
  erro de validação campo a campo, erro genérico de servidor, sucesso.

## Edge Cases

1. **Documento duplicado no mesmo tenant** — criar cliente com CPF/CNPJ já
   cadastrado (e não soft-deleted) no tenant retorna erro de validação
   (409), não 500. Documento pode repetir entre tenants diferentes.
2. **CPF/CNPJ inválido** — dígito verificador incorreto é rejeitado antes de
   chegar no Manager (reuso do `DocumentValidatorService`).
3. **Mecânico tentando criar/editar/excluir** — `RolesGuard` bloqueia com
   403; a UI nem mostra os botões, mas o backend é a fonte de verdade.
4. **Excluir cliente com veículos/OS vinculados** — soft delete é permitido;
   os registros vinculados (Feature 4/5, quando existirem) mantêm a
   referência ao `customer_id` mesmo após o soft delete, preservando
   histórico.
5. **Buscar/editar/excluir cliente de outro tenant via manipulação de id** —
   o Prisma Middleware (já validado na Feature 2) deve retornar
   "não encontrado", nunca vazar dado de outro tenant; comportamento
   coberto pelo mesmo padrão de teste de isolamento já existente.
6. **Reativar cliente soft-deleted criando outro com o mesmo documento** —
   como o índice único é parcial (`WHERE deleted_at IS NULL`), um novo
   cadastro com o mesmo documento é permitido depois do soft delete; isso é
   esperado (mesmo padrão de `tenants.document`).
7. **Nome ou telefone vazio/só espaços** — rejeitado na validação do DTO
   (`class-validator`), antes do Manager.

## Testing Criteria

**Happy path:**
- Criar cliente PF e PJ com dados válidos retorna 201 com o cliente criado.
- Editar cliente atualiza os campos permitidos e mantém `document`/`type`
  inalterados mesmo se enviados no body.
- Listar clientes retorna apenas os do tenant do requisitante, respeitando
  `offset`/`limit`.
- Buscar por nome parcial ou documento retorna os clientes esperados.
- Excluir cliente marca `deleted_at` e ele some da listagem padrão.

**Edge cases:**
- Documento duplicado no mesmo tenant retorna 409.
- Documento inválido (dígito verificador) retorna 400.
- Mesmo documento em dois tenants diferentes: ambos criam com sucesso.
- `MECHANIC` recebe 403 em create/update/delete, 200 em get/list.
- Teste de isolamento multi-tenant: cliente do tenant A nunca aparece em
  get/list/update/delete feitos autenticado como tenant B (mesmo padrão do
  teste dedicado da Feature 2).
- Soft delete com veículo/OS vinculado (quando Feature 4/5 existirem) não
  quebra a integridade do histórico — por ora, testar que o soft delete em
  si não falha mesmo sem vínculos reais ainda existirem.

## Dependencies

- Feature 1 (Setup Monorepo & Infra Base) — concluída.
- Feature 2 (IAM: Tenant, Auth, RBAC) — concluída; reusa
  `TenantContextGuard`, Prisma Middleware, `JwtAuthGuard`, `RolesGuard`,
  `DocumentValidatorService`.
