# Arquitetura Unificada — MVP Núcleo Operacional (Oficina SaaS)

**Data:** 2026-07-14
**Status:** Aprovado
**Autor:** Sessão de brainstorming (Claude Code) + Sergio Oliveira

## 1. Objetivo e Contexto

Construir um ERP SaaS multi-tenant para oficinas mecânicas. Este documento cobre a
**arquitetura unificada do MVP** — o menor recorte vertical que já é um produto
utilizável de ponta a ponta por uma oficina real. Módulos além do MVP (financeiro,
orçamento, estoque, CRM, agenda, integrações fiscais/WhatsApp) são planejados como
epics separados, cada um com sua própria spec, depois que este núcleo estiver em
produção.

Todo o desenho aqui foi validado explicitamente com o usuário, seção por seção,
antes de qualquer linha de código ser escrita.

## 2. Escopo do MVP

**Dentro do escopo:**
- Autenticação multi-tenant (signup self-service, login, refresh token, logout)
- RBAC com papéis fixos (Admin, Gerente, Mecânico, Recepção)
- Cadastro de Clientes (PF/PJ)
- Cadastro de Veículos vinculados a Clientes
- Ordem de Serviço (abertura, checklist, diagnóstico, status, técnico responsável,
  histórico de mudança de status)
- Auditoria básica de ações (audit log)

**Fora do escopo do MVP (fica para epics futuros):**
- Orçamento formal (PDF, aprovação online, conversão para OS)
- Peças e mão de obra na OS (itens de estoque, custos)
- Agenda/calendário de agendamentos
- Estoque, compras, fornecedores
- Financeiro (contas a pagar/receber, fluxo de caixa, DRE)
- CRM (funil, campanhas)
- Dashboard/KPIs, relatórios
- Integrações (WhatsApp, e-mail, SMS, NFe/NFSe, PIX)
- RBAC granular (permissões customizáveis por tenant)
- MFA (schema já preparado, fluxo não implementado)

## 3. Arquitetura Geral

**Monorepo** orquestrado com **Turborepo + pnpm workspaces**:

```
oficina-saas/
├── backend/            # NestJS
├── frontend/           # Next.js (App Router)
├── packages/
│   └── contracts/      # DTOs/tipos TS compartilhados BE↔FE
├── database/           # Prisma schema, migrations, seeds
├── docker/              # docker-compose, nginx
├── infra/               # Terraform (AWS) — cresce pós-MVP
├── docs/
├── scripts/
├── turbo.json
└── pnpm-workspace.yaml
```

**Backend — Clean Architecture por bounded context (DDD):**

```
backend/src/
├── modules/
│   ├── iam/          # tenant, user, auth, rbac
│   │   ├── controllers/    # HTTP parsing + delegação, nunca acessa repository
│   │   ├── managers/       # regra de negócio, orquestração, transações
│   │   ├── repositories/   # única camada que fala com Prisma
│   │   ├── entities/
│   │   ├── dto/
│   │   └── guards/
│   ├── crm/           # clientes, veículos
│   └── workshop/      # ordem de serviço
├── shared/            # tenant-context, filters, interceptors, pipes
└── main.ts
```

Regra de dependência: `Controller → Manager → Repository`, nunca o inverso, nunca
pulando camada. Controllers não acessam Prisma nem repositórios diretamente.

**Async:** Redis + BullMQ configurados na infraestrutura desde o MVP (docker-compose,
módulo NestJS), com uma fila de exemplo (gravação assíncrona de audit log), para que
módulos futuros (WhatsApp, e-mail, NFe) plugem sem re-arquitetar.

**CQRS:** não utilizado no MVP — poucas entidades, sem leitura pesada divergente da
escrita. A separação em camadas já deixa espaço para read-models por módulo no
futuro, sem reescrever o núcleo.

**Frontend:** Next.js App Router, Tailwind + shadcn/ui, TanStack Query (estado de
servidor), Zustand (estado de UI local), React Hook Form + Zod (formulários,
schemas espelhando os DTOs de `packages/contracts`).

## 4. Estratégia Multi-tenant

- **Shared Database, shared schema.** Toda tabela tenant-scoped tem coluna `tenant_id`.
- **Isolamento em duas partes:**
  1. `TenantContextGuard` (NestJS) extrai `tenant_id` do JWT e popula um contexto de
     request via `AsyncLocalStorage` — evita repassar o parâmetro manualmente por
     todas as camadas.
  2. **Prisma Middleware** injeta automaticamente `tenant_id` em toda query (`where`
     e `create`), lendo do contexto acima. Nenhuma query em `Repository` pode ser
     escrita sem passar pelo middleware.
- Índice composto `(tenant_id, ...)` nas colunas mais consultadas de cada tabela
  tenant-scoped.
- **Caminho de evolução (documentado, não implementado agora):** migrar para
  schema-por-cliente ou banco-por-cliente no futuro é uma troca isolada na
  resolução de conexão (`TenantContextService`), porque toda query já passa pelo
  mesmo par Manager/Repository — não exige tocar em regra de negócio.
- Row-Level Security do Postgres foi avaliado e descartado para o MVP (complexidade
  de setar `app.tenant_id` por conexão com o pooling do Prisma não compensa neste
  estágio); pode ser adicionado depois como camada extra de defesa em profundidade,
  sem quebrar o middleware.

## 5. Modelo de Dados (DER do MVP)

Convenções: `snake_case`, `TEXT` (nunca `VARCHAR`), `UUID` (`uuid_generate_v4()`),
`TIMESTAMPTZ` em UTC, soft delete (`deleted_at`), sem foreign keys físicas nem
`CASCADE` — integridade referencial validada na camada de aplicação (Manager).

### tenants
| Coluna | Tipo | Observação |
|---|---|---|
| id | UUID PK | |
| name | TEXT | |
| document | TEXT | CNPJ ou CPF |
| plan | TEXT | plano de assinatura |
| status | TEXT | active / suspended / cancelled |
| created_at / updated_at / deleted_at | TIMESTAMPTZ | |

### users
| Coluna | Tipo | Observação |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID | índice |
| email | TEXT | único por tenant |
| password_hash | TEXT | |
| name | TEXT | |
| role_id | UUID | FK lógica para `roles` |
| status | TEXT | active / invited / disabled |
| mfa_enabled | BOOLEAN | default false, placeholder |
| mfa_secret | TEXT | nullable, placeholder |
| created_at / updated_at / deleted_at | TIMESTAMPTZ | |

### refresh_tokens
| Coluna | Tipo | Observação |
|---|---|---|
| id | UUID PK | |
| user_id | UUID | índice |
| token_hash | TEXT | nunca texto puro |
| expires_at | TIMESTAMPTZ | |
| revoked_at | TIMESTAMPTZ | nullable |
| user_agent | TEXT | |
| ip | INET | |
| created_at | TIMESTAMPTZ | |

### roles / permissions / role_permissions
Papéis fixos do MVP semeados via seed: `ADMIN`, `MANAGER`, `MECHANIC`, `FRONT_DESK`.
Modelados como tabelas (não enum hardcoded) para não exigir migration destrutiva
quando o RBAC granular for implementado.

| Tabela | Colunas principais |
|---|---|
| roles | id, name, created_at — papéis globais do sistema, sem `tenant_id` no MVP |
| permissions | id, key (ex: `os.create`), description |
| role_permissions | role_id, permission_id |

Papéis são globais e fixos no MVP (mesmos 4 papéis para todo tenant). Quando o
RBAC granular for implementado, `tenant_id` pode ser adicionado a `roles` via
migration aditiva (coluna nullable), sem quebrar os papéis globais existentes.

### audit_logs
| Coluna | Tipo | Observação |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID | índice |
| user_id | UUID | |
| action | TEXT | ex: `service_order.status_changed` |
| entity | TEXT | |
| entity_id | UUID | |
| metadata | JSONB | |
| created_at | TIMESTAMPTZ | |

### customers
| Coluna | Tipo | Observação |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID | índice |
| type | TEXT | `PF` / `PJ` |
| document | TEXT | CPF ou CNPJ |
| name | TEXT | |
| email | TEXT | nullable |
| phone | TEXT | |
| address | JSONB | |
| notes | TEXT | nullable |
| created_at / updated_at / deleted_at | TIMESTAMPTZ | |

### vehicles
| Coluna | Tipo | Observação |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID | índice |
| customer_id | UUID | índice |
| brand | TEXT | |
| model | TEXT | |
| year | INTEGER | |
| engine | TEXT | |
| fuel_type | TEXT | |
| plate | TEXT | |
| chassis | TEXT | |
| mileage | INTEGER | |
| photos | TEXT[] | URLs |
| created_at / updated_at / deleted_at | TIMESTAMPTZ | |

### service_orders
| Coluna | Tipo | Observação |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID | índice |
| customer_id | UUID | índice |
| vehicle_id | UUID | índice |
| status | TEXT | ver máquina de estados abaixo |
| checklist | JSONB | |
| diagnosis | TEXT | nullable |
| technician_id | UUID | FK lógica para `users`, nullable |
| opened_at | TIMESTAMPTZ | |
| closed_at | TIMESTAMPTZ | nullable |
| created_at / updated_at / deleted_at | TIMESTAMPTZ | |

Estados de `status` (definidos aqui como base; refinamento fino de máquina de
estados fica para a spec do módulo Workshop): `OPEN`, `IN_PROGRESS`,
`WAITING_PARTS`, `COMPLETED`, `DELIVERED`, `CANCELLED`.

### service_order_status_history
| Coluna | Tipo | Observação |
|---|---|---|
| id | UUID PK | |
| service_order_id | UUID | índice |
| from_status | TEXT | nullable (primeira entrada) |
| to_status | TEXT | |
| changed_by | UUID | FK lógica para `users` |
| changed_at | TIMESTAMPTZ | |

## 6. Autenticação e RBAC

- `POST /api/v1/auth/signup` — cria `Tenant` + `User` admin numa única transação
  (self-service)
- `POST /api/v1/auth/login` — retorna access token JWT (~15 min) + refresh token
  (rotacionado a cada uso, hash armazenado em `refresh_tokens`)
- `POST /api/v1/auth/refresh` — rotaciona o refresh token
- `POST /api/v1/auth/logout` — revoga o refresh token atual
- `JwtAuthGuard` (valida token + carrega `TenantContext`) e `RolesGuard`
  (`@Roles('ADMIN','MANAGER')`) protegem toda rota exceto auth pública
- MFA: colunas já existem em `users`, fluxo de verificação (TOTP) não é
  implementado no MVP

## 7. Convenções de API

Mantida a mesma filosofia RPC-style já usada nos demais projetos do usuário
(Kotlin/Micronaut), adaptada para NestJS, por consistência entre stacks:

- Apenas `@Get()` e `@Post()` — nunca `PUT`/`PATCH`/`DELETE`
- Sempre query params (`@Query('tenant_id')`) — nunca path params (`@Param`)
- Listagens: `POST /resource/list` com `{ offset, limit, filters, sort }` no body
  — nunca `page`/`size`
- Ações: `POST /resource/delete`, `POST /resource/restore`, etc.
- DTOs de request/response vivem exclusivamente em `packages/contracts/` —
  nunca inline nos controllers
- JSON trafega em `snake_case`; código TypeScript usa `camelCase` (conversão via
  interceptor nos dois lados, mesmo padrão já usado no frontend React do usuário)
- Documentado via Swagger/OpenAPI, gerado a partir dos DTOs de `packages/contracts`

## 8. Estratégia de Testes

- **Backend (Jest):** unitários em Managers (regra de negócio isolada), integração
  em Repositories (banco real via Testcontainers), E2E em Controllers (stack HTTP
  completa)
- **Frontend:** Vitest + Testing Library (componentes/hooks), Playwright (E2E dos
  fluxos principais: signup, login, criar cliente/veículo, abrir OS)
- Cobertura obrigatória antes de merge: Managers e Guards (lógica de negócio e
  segurança) — não perseguir 100% em DTOs/tipos

## 9. Deploy e CI/CD

- GitHub Actions: `lint` + `typecheck` + `test` em todo PR; `build` com cache do
  Turborepo valida backend e frontend
- Deploy automático para **Railway (staging)** a cada merge em `develop`
- Deploy para **AWS ECS Fargate + RDS (produção)** a partir de `main`, aprovado
  manualmente, seguindo o padrão de pipeline já usado em outros projetos do usuário
- Secrets sempre via Secrets Manager (nunca env vars em texto puro em produção)

## 10. Observabilidade (nível MVP)

- Logs estruturados em JSON, UTC, via Pino, correlacionados por `request_id` +
  `tenant_id`
- `GET /health` (liveness/readiness), obrigatório para ECS/Railway
- Métricas/tracing completos (OpenTelemetry, dashboards) ficam para quando houver
  tráfego real em produção — não implementados agora, apenas logger pronto para
  plugar depois

## 11. Critérios de Sucesso do MVP

- Uma oficina consegue se cadastrar sozinha (signup), criar usuários com papéis
  diferentes, cadastrar clientes e veículos, e abrir/acompanhar uma Ordem de
  Serviço do início ao fim — tudo isolado por tenant, sem vazamento de dados entre
  oficinas diferentes.
- Deploy automatizado funcionando em staging (Railway) a partir do primeiro PR
  mergeado.
- Testes cobrindo os fluxos de autenticação, isolamento multi-tenant e ciclo de
  vida da Ordem de Serviço.

## 12. Roadmap Pós-MVP (referência, não escopo desta spec)

Após este núcleo estar em produção, os módulos abaixo entram como epics
independentes, cada um com sua própria spec → plan → build:

1. Orçamento (PDF, aprovação online, conversão para OS)
2. Agenda/calendário de agendamentos
3. Estoque, compras e fornecedores (incluindo peças/mão de obra na OS)
4. Financeiro (contas a pagar/receber, fluxo de caixa, DRE)
5. CRM (funil, campanhas, follow-up)
6. Dashboard, KPIs e relatórios
7. Integrações (WhatsApp, e-mail, SMS, NFe/NFSe, PIX)
8. RBAC granular e MFA completo
9. Evolução multi-tenant (schema-per-tenant / db-per-tenant) conforme volume de
   clientes exigir

## 13. Próximos Passos

1. Usuário revisa esta spec.
2. Decompor o MVP em features ordenadas via `/spartan:epic`.
3. Para cada feature: `/spartan:spec` → `/spartan:plan` → `/spartan:build`.
