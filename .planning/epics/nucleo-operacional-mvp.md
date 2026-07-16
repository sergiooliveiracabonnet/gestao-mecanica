# Epic: Núcleo Operacional da Oficina (MVP)

**Created**: 2026-07-14
**Status**: planning
**Owner**: Sergio Oliveira

---

## Why

Construir o núcleo operacional do ERP SaaS de oficinas mecânicas: uma oficina
consegue se cadastrar (multi-tenant, self-service), gerenciar usuários com papéis
fixos, cadastrar clientes e veículos, e abrir/acompanhar uma Ordem de Serviço do
início ao fim. É a menor fatia vertical que já é um produto usável em produção,
antes de módulos como orçamento, estoque, financeiro e CRM entrarem como epics
futuros.

Arquitetura de referência: `docs/superpowers/specs/2026-07-14-arquitetura-mvp-design.md`.

---

## Success Criteria

- [ ] Signup self-service cria tenant + usuário admin; usuários com papéis
      diferentes (Admin, Gerente, Mecânico, Recepção) têm acessos corretos
- [ ] Zero vazamento de dados entre tenants (isolamento coberto por testes de
      integração dedicados)
- [ ] Ciclo completo Cliente → Veículo → Ordem de Serviço funcionando ponta a
      ponta, com histórico de status
- [ ] Deploy automático em staging (Railway) a cada merge em `develop`

---

## Features

| # | Feature | Status | Spec | Plan | Depends On |
|---|---------|--------|------|------|------------|
| 1 | Setup Monorepo & Infra Base | done | [spec](../specs/setup-monorepo-infra-base.md) | [plan](../plans/setup-monorepo-infra-base.md) | — |
| 2 | IAM (Tenant, Auth, RBAC fixo) | done | [spec](../specs/iam-tenant-auth-rbac.md) | [plan](../plans/iam-tenant-auth-rbac.md) | #1 |
| 3 | Clientes (CRUD PF/PJ) | todo | [spec](../specs/clientes-crud-pf-pj.md) | [plan](../plans/clientes-crud-pf-pj.md) | #1, #2 |
| 4 | Veículos (CRUD vinculado a Cliente) | todo | — | — | #1, #2, #3 |
| 5 | Ordem de Serviço | todo | — | — | #1, #2, #3, #4 |

---

## Feature Briefs

### Feature 1: Setup Monorepo & Infra Base
Turborepo + pnpm workspaces, Docker Compose (Postgres, Redis, NGINX), scaffolds
iniciais de `backend/` (NestJS) e `frontend/` (Next.js App Router), configuração
inicial do Prisma (`database/prisma/schema.prisma`), pacote `packages/contracts/`,
e esqueleto de CI (GitHub Actions: lint/typecheck/test/build). Sem regra de
negócio ainda — só a base que todas as demais features vão usar.

### Feature 2: IAM (Tenant, Auth, RBAC fixo)
Modelagem e migrations de `tenants`, `users`, `refresh_tokens`, `roles`,
`permissions`, `role_permissions`, `audit_logs`. Endpoints de
signup/login/refresh/logout (RPC-style, POST-only). `TenantContextGuard` +
Prisma Middleware para isolamento multi-tenant. `RolesGuard` com os 4 papéis
fixos. Maior feature do epic — pode ser dividida em sub-tarefas na fase de plan
se necessário.

### Feature 3: Clientes (CRUD PF/PJ)
CRUD completo de `customers` (pessoa física/jurídica), respeitando isolamento
por tenant e RBAC. Listagem via `POST /customers/list` com offset/limit.

### Feature 4: Veículos (CRUD vinculado a Cliente)
CRUD completo de `vehicles`, sempre vinculado a um `customer_id` existente do
mesmo tenant. Inclui upload/armazenamento de fotos (URLs).

### Feature 5: Ordem de Serviço
CRUD de `service_orders` + `service_order_status_history`. Abertura, checklist
(JSONB), diagnóstico, atribuição de técnico, transições de status com histórico
auditável.

---

## Risks

- Vazamento de dados entre tenants por bug no Prisma Middleware — mitigar com
  suíte de testes de integração dedicada a isolamento (Feature 2)
- Adaptar a convenção RPC-style (herdada dos projetos Kotlin/Micronaut) para
  NestJS é terreno novo — validar cedo na Feature 1/2 antes de replicar nas
  demais features
- Segurança do signup público (rate limit, validação de documento CPF/CNPJ) —
  detalhar na spec da Feature 2

---

## Notes

- Módulos pós-MVP (orçamento, agenda, estoque, financeiro, CRM, dashboard,
  integrações, RBAC granular, MFA) ficam para epics futuros — ver seção 12 da
  spec de arquitetura.
- **Pendência da Feature 2 antes de começar a Feature 3**: a migration
  `database/prisma/migrations/1_iam_models/` foi escrita à mão (sem Docker
  disponível na sessão que implementou) e nunca rodou contra um Postgres de
  verdade. Antes de escrever a Feature 3 (Clientes), rodar localmente:
  `docker compose up` → `pnpm --filter @oficina/database run migrate:deploy`
  → `pnpm --filter @oficina/database run seed` → `pnpm run test:e2e` no
  backend (repositories, isolamento multi-tenant, controllers) → Playwright
  no frontend. Corrigir qualquer divergência encontrada antes de empilhar
  mais schema em cima.
