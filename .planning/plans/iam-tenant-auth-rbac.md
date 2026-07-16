# Plan: IAM (Tenant, Auth, RBAC fixo)

**Spec**: .planning/specs/iam-tenant-auth-rbac.md
**Epic**: nucleo-operacional-mvp
**Created**: 2026-07-16
**Status**: draft

---

## Stack Detection

Monorepo já existe (Feature 1): `backend/` NestJS, `frontend/` Next.js (App
Router), `packages/contracts/` (TS compartilhado), `database/prisma/` (só
datasource/generator, sem models). Modo: **full-stack plan** — a spec tem
seção de API Changes e UI Changes, e o épico marca #2 como maior feature,
fundação de #3/#4/#5.

Nenhum destes existe ainda no backend e precisam ser criados nesta feature:
PrismaService/PrismaModule, TenantContextService, guards, BullMQ/fila de
audit log. No frontend, nenhuma dependência de estado/formulário
(TanStack Query, Zustand, React Hook Form, Zod) foi instalada na Feature 1 —
só o scaffold básico (Tailwind, shadcn config, tema).

---

## Components

| Component | Type | Purpose |
|-----------|------|---------|
| `PrismaService` / `PrismaModule` | Shared Service | Singleton do `PrismaClient`, registra o middleware de isolamento |
| `TenantContextService` | Shared Service | `AsyncLocalStorage` com `tenant_id`/`user_id` da requisição atual |
| Tenant isolation middleware | Prisma Middleware | Injeta `tenant_id` em toda query `where`/`create` das tabelas tenant-scoped |
| `JwtAuthGuard` | Shared Guard | Valida o access token, popula `request.user`; ignora rotas `@Public()` |
| `TenantContextGuard` | Shared Guard | Roda após o `JwtAuthGuard`; popula o `TenantContextService` |
| `RolesGuard` + `@Roles()` | Shared Guard/Decorator | Bloqueia rota se o papel do usuário não estiver na lista permitida |
| `@Public()` / `@CurrentUser()` | Shared Decorators | Marca rota pública / extrai usuário autenticado do request |
| `PasswordService` | IAM Service | Hash/verify de senha (bcrypt) |
| `TokenService` | IAM Service | Gera/valida JWT de acesso; gera/rotaciona/hasheia refresh token |
| `DocumentValidatorService` | IAM Service | Valida dígito verificador de CPF/CNPJ |
| `TenantRepository` / `UserRepository` / `RefreshTokenRepository` / `RoleRepository` | IAM Repository | Única camada que fala com Prisma para essas tabelas |
| `AuditLogRepository` | Shared Repository | Insere em `audit_logs` (reutilizável pelas próximas features) |
| `QueueModule` (BullMQ) | Shared Infra | Registra conexão Redis + fila `audit-log` |
| `AuditLogService` / `AuditLogProcessor` | Shared Service/Processor | Enfileira evento / consome e grava no banco (assíncrono) |
| `AuthManager` | IAM Manager | Orquestra signup, login, refresh, logout (transações, regras) |
| `UserManager` | IAM Manager | Orquestra invite, accept-invite, list (escopado por tenant + papel) |
| `AuthController` | IAM Controller | `/auth/signup`, `/auth/login`, `/auth/refresh`, `/auth/logout` |
| `UsersController` | IAM Controller | `/users/invite`, `/users/accept-invite`, `/users/list` |
| `apiClient` (axios) | Frontend Infra | Instância axios + interceptors `snake_case`↔`camelCase` |
| `useAuthStore` (Zustand) | Frontend State | Usuário/tenant/access token em memória, ação de logout |
| Auth/Users hooks (TanStack Query) | Frontend State | `useSignup`, `useLogin`, `useLogout`, `useInviteUser`, `useAcceptInvite`, `useUsersList` |
| Signup/Login/Invite forms | Frontend Component | React Hook Form + Zod, espelhando os DTOs de `packages/contracts` |
| `middleware.ts` (Next.js) | Frontend Infra | Redireciona não-autenticado / sem permissão antes de renderizar |

---

## File Locations

### Database

| File | Location | Purpose |
|------|----------|---------|
| `schema.prisma` | `database/prisma/` | Adiciona models `Tenant`, `User`, `RefreshToken`, `Role`, `Permission`, `RolePermission`, `AuditLog` |
| migration SQL | `database/prisma/migrations/` | Gerada por `prisma migrate dev` a partir do schema acima |
| `seed.ts` | `scripts/` | Popula os 4 papéis fixos + permissions iniciais |

### Contracts (`packages/contracts/src/`)

| File | Location | Purpose |
|------|----------|---------|
| `request/auth.request.ts` | `request/` | `SignupRequest`, `LoginRequest`, `RefreshRequest`, `LogoutRequest` |
| `response/auth.response.ts` | `response/` | `AuthResponse` (tokens + user + tenant), `TenantResponse`, `UserResponse` |
| `request/user.request.ts` | `request/` | `InviteUserRequest`, `AcceptInviteRequest`, `UserListRequest` |
| `response/user.response.ts` | `response/` | `UserListItemResponse`, `InviteUserResponse` |
| `response/pagination.response.ts` | `response/` | `PaginationData<T>` genérico (offset/limit/total/has_more) |
| `index.ts` | `src/` | Barrel — exporta os módulos acima |

### Backend — Shared (`backend/src/shared/`)

| File | Location | Purpose |
|------|----------|---------|
| `prisma/prisma.service.ts`, `prisma/prisma.module.ts` | `shared/prisma/` | Singleton do Prisma Client |
| `prisma/tenant-isolation.middleware.ts` | `shared/prisma/` | Middleware de isolamento multi-tenant |
| `tenant-context/tenant-context.service.ts`, `tenant-context/tenant-context.module.ts` | `shared/tenant-context/` | `AsyncLocalStorage` da requisição |
| `guards/jwt-auth.guard.ts` | `shared/guards/` | Valida JWT |
| `guards/tenant-context.guard.ts` | `shared/guards/` | Popula tenant context pós-JWT |
| `guards/roles.guard.ts` | `shared/guards/` | Enforce `@Roles()` |
| `decorators/public.decorator.ts` | `shared/decorators/` | Marca rota como pública |
| `decorators/roles.decorator.ts` | `shared/decorators/` | `@Roles('ADMIN', 'MANAGER')` |
| `decorators/current-user.decorator.ts` | `shared/decorators/` | Extrai `request.user` |
| `queue/queue.module.ts` | `shared/queue/` | Config BullMQ (conexão Redis, fila `audit-log`) |
| `audit-log/audit-log.repository.ts` | `shared/audit-log/` | Insere `audit_logs` via Prisma |
| `audit-log/audit-log.service.ts` | `shared/audit-log/` | `enqueue(event)` — produtor da fila |
| `audit-log/audit-log.processor.ts` | `shared/audit-log/` | Consumidor — grava via repository |
| `audit-log/audit-log.module.ts` | `shared/audit-log/` | Wiring do módulo |

### Backend — IAM (`backend/src/modules/iam/`)

| File | Location | Purpose |
|------|----------|---------|
| `services/password.service.ts` | `services/` | Hash/verify bcrypt |
| `services/token.service.ts` | `services/` | JWT + refresh token |
| `services/document-validator.service.ts` | `services/` | CPF/CNPJ |
| `repositories/tenant.repository.ts` | `repositories/` | CRUD `tenants` |
| `repositories/user.repository.ts` | `repositories/` | CRUD `users` |
| `repositories/refresh-token.repository.ts` | `repositories/` | CRUD `refresh_tokens` |
| `repositories/role.repository.ts` | `repositories/` | Leitura `roles`/`permissions` |
| `managers/auth.manager.ts` | `managers/` | signup, login, refresh, logout |
| `managers/user.manager.ts` | `managers/` | invite, accept-invite, list |
| `controllers/auth.controller.ts` | `controllers/` | Rotas `/auth/*` |
| `controllers/users.controller.ts` | `controllers/` | Rotas `/users/*` |
| `iam.module.ts` | `modules/iam/` | Wiring do módulo IAM |

### Frontend (`frontend/`)

| File | Location | Purpose |
|------|----------|---------|
| `lib/api/client.ts` | `lib/api/` | Instância axios + interceptors |
| `lib/case-convert.ts` | `lib/` | `keysToSnake` / `keysToCamel` |
| `features/auth/api/auth-api.ts` | `features/auth/api/` | signup/login/refresh/logout |
| `features/users/api/users-api.ts` | `features/users/api/` | invite/accept-invite/list |
| `stores/auth-store.ts` | `stores/` | Zustand — user/tenant/access token |
| `features/auth/hooks/use-auth.ts` | `features/auth/hooks/` | Mutations/queries de auth |
| `features/users/hooks/use-users.ts` | `features/users/hooks/` | Mutations/queries de users |
| `app/(auth)/signup/page.tsx`, `features/auth/components/SignupForm.tsx` | — | Tela de signup |
| `app/(auth)/login/page.tsx`, `features/auth/components/LoginForm.tsx` | — | Tela de login |
| `app/(dashboard)/users/page.tsx`, `features/users/components/UsersTable.tsx`, `features/users/components/InviteUserModal.tsx` | — | Tela "Usuários" |
| `app/invite/[token]/page.tsx`, `features/auth/components/AcceptInviteForm.tsx` | — | Tela de aceite de convite |
| `middleware.ts` | raiz `frontend/` | Guard de rota |

## Files to Change

| File | What Changes | Why |
|------|-------------|-----|
| `database/prisma/schema.prisma` | Adiciona os 7 models desta feature | Estava vazio (só datasource/generator) |
| `scripts/seed.ts` | Implementa seed real (papéis + permissions) | Estava placeholder vazio |
| `backend/package.json` | Adiciona `@prisma/client`, `bcrypt`, `@nestjs/jwt`, `@nestjs/throttler`, `@nestjs/bullmq`, `bullmq` | Dependências novas desta feature |
| `backend/src/app.module.ts` | Importa `IamModule`, `PrismaModule`, `TenantContextModule`, `QueueModule`, `AuditLogModule`; registra `ThrottlerModule` e guards globais | Wiring da feature |
| `packages/contracts/src/index.ts` | Exporta os novos request/response de auth/user | Barrel estava vazio |
| `frontend/package.json` | Adiciona `@tanstack/react-query`, `zustand`, `react-hook-form`, `zod`, `axios` | Dependências novas desta feature |
| `.env.example` (raiz) | Adiciona `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`, `THROTTLE_TTL`, `THROTTLE_LIMIT` | Placeholder já apontava "chegam na Feature 2" |
| `backend/.env.example` | Reflete as mesmas variáveis específicas do backend | Idem |

---

## Tasks

### Phase 1: Database Models & Seed

| # | Task | Files |
|---|------|-------|
| 1 | Adicionar models `Tenant`, `User`, `RefreshToken`, `Role`, `Permission`, `RolePermission`, `AuditLog` ao schema (snake_case, soft delete, sem FK física) | `database/prisma/schema.prisma` |
| 2 | Gerar migration (`prisma migrate dev --name iam_models`) | `database/prisma/migrations/*_iam_models/migration.sql` |
| 3 | Implementar `scripts/seed.ts` — semeia `ADMIN`/`MANAGER`/`MECHANIC`/`FRONT_DESK` + permissions iniciais | `scripts/seed.ts` |

### Phase 2: Contracts (paralelo à Phase 1)

| # | Task | Files |
|---|------|-------|
| 4 | Request DTOs de auth | `packages/contracts/src/request/auth.request.ts` |
| 5 | Response DTOs de auth (`AuthResponse`, `TenantResponse`, `UserResponse`) | `packages/contracts/src/response/auth.response.ts` |
| 6 | Request/response DTOs de users + `PaginationData<T>` genérico | `packages/contracts/src/request/user.request.ts`, `packages/contracts/src/response/user.response.ts`, `packages/contracts/src/response/pagination.response.ts` |
| 7 | Atualizar barrel | `packages/contracts/src/index.ts` |

### Phase 3: Backend Shared Infra (depende de Phase 1)

| # | Task | Files |
|---|------|-------|
| 8 | `PrismaService`/`PrismaModule` | `backend/src/shared/prisma/prisma.service.ts`, `backend/src/shared/prisma/prisma.module.ts` |
| 9 | `TenantContextService`/módulo (`AsyncLocalStorage`) | `backend/src/shared/tenant-context/tenant-context.service.ts`, `backend/src/shared/tenant-context/tenant-context.module.ts` |
| 10 | Middleware de isolamento multi-tenant, registrado no `PrismaService` | `backend/src/shared/prisma/tenant-isolation.middleware.ts`, `backend/src/shared/prisma/prisma.service.ts` (edit) |
| 11 | `JwtAuthGuard`, `TenantContextGuard`, `@Public()` | `backend/src/shared/guards/jwt-auth.guard.ts`, `backend/src/shared/guards/tenant-context.guard.ts`, `backend/src/shared/decorators/public.decorator.ts` |
| 12 | `RolesGuard`, `@Roles()`, `@CurrentUser()` | `backend/src/shared/guards/roles.guard.ts`, `backend/src/shared/decorators/roles.decorator.ts`, `backend/src/shared/decorators/current-user.decorator.ts` |
| 13 | `ThrottlerModule` global (signup/login/accept-invite) | `backend/src/app.module.ts` (edit), `backend/package.json` (edit) |

### Phase 4: Backend Domain Services (paralelo à Phase 3)

| # | Task | Files |
|---|------|-------|
| 14 | `PasswordService` (bcrypt) | `backend/src/modules/iam/services/password.service.ts` |
| 15 | `TokenService` (JWT + refresh token) | `backend/src/modules/iam/services/token.service.ts`, `backend/package.json` (edit) |
| 16 | `DocumentValidatorService` (CPF/CNPJ) | `backend/src/modules/iam/services/document-validator.service.ts` |

### Phase 5: Backend Repositories (depende de Phases 1, 3)

| # | Task | Files |
|---|------|-------|
| 17 | `TenantRepository` | `backend/src/modules/iam/repositories/tenant.repository.ts` |
| 18 | `UserRepository` | `backend/src/modules/iam/repositories/user.repository.ts` |
| 19 | `RefreshTokenRepository` | `backend/src/modules/iam/repositories/refresh-token.repository.ts` |
| 20 | `RoleRepository` | `backend/src/modules/iam/repositories/role.repository.ts` |

### Phase 6: Audit Log Queue (depende de Phase 3)

| # | Task | Files |
|---|------|-------|
| 21 | `AuditLogRepository` | `backend/src/shared/audit-log/audit-log.repository.ts` |
| 22 | `QueueModule` (BullMQ + Redis) | `backend/src/shared/queue/queue.module.ts`, `backend/package.json` (edit) |
| 23 | `AuditLogService` (produtor) + `AuditLogProcessor` (consumidor) + módulo | `backend/src/shared/audit-log/audit-log.service.ts`, `backend/src/shared/audit-log/audit-log.processor.ts`, `backend/src/shared/audit-log/audit-log.module.ts` |

### Phase 7: Backend Managers (depende de Phases 2, 4, 5, 6)

| # | Task | Files |
|---|------|-------|
| 24 | `AuthManager` — signup, login, refresh, logout (transações, validação de documento/e-mail únicos, hash de senha, emissão/rotação de tokens, audit log) | `backend/src/modules/iam/managers/auth.manager.ts` |
| 25 | `UserManager` — invite (gera token, status `invited`), accept-invite (valida token/expiração, ativa usuário), list (escopado por tenant, offset/limit) | `backend/src/modules/iam/managers/user.manager.ts` |

### Phase 8: Backend Controllers & Wiring (depende de Phase 7)

| # | Task | Files |
|---|------|-------|
| 26 | `AuthController` | `backend/src/modules/iam/controllers/auth.controller.ts` |
| 27 | `UsersController` | `backend/src/modules/iam/controllers/users.controller.ts` |
| 28 | `IamModule` + wiring em `AppModule` (guards globais `JwtAuthGuard`→`TenantContextGuard`→`RolesGuard`, exceto rotas `@Public()`) | `backend/src/modules/iam/iam.module.ts`, `backend/src/app.module.ts` (edit) |

### Phase 9: Backend Tests (depende de Phase 8)

| # | Task | Files |
|---|------|-------|
| 29 | Testes de integração dos repositories contra Postgres real (insert, unicidade, soft delete, filtros) | `backend/src/modules/iam/repositories/tenant.repository.spec.ts`, `user.repository.spec.ts`, `refresh-token.repository.spec.ts` |
| 30 | Unit tests `AuthManager` (happy path + edge cases: documento/e-mail duplicado, senha curta, refresh token revogado/reutilizado, usuário disabled) | `backend/src/modules/iam/managers/auth.manager.spec.ts` |
| 31 | Unit tests `UserManager` (invite, accept-invite expirado/já aceito, list escopado) | `backend/src/modules/iam/managers/user.manager.spec.ts` |
| 32 | Teste de integração **dedicado a isolamento multi-tenant** (dois tenants, prova de que um nunca lê/escreve dado do outro) | `backend/test/tenant-isolation.e2e-spec.ts` |
| 33 | Testes E2E dos controllers (signup→login→refresh→logout; invite→accept-invite→login; `RolesGuard` 403; rate limit 429) | `backend/test/auth.e2e-spec.ts`, `backend/test/users.e2e-spec.ts` |

### Phase 10: Frontend Setup (paralelo a todo o backend)

| # | Task | Files |
|---|------|-------|
| 34 | Instalar deps (`@tanstack/react-query`, `zustand`, `react-hook-form`, `zod`, `axios`) | `frontend/package.json` |
| 35 | `apiClient` (axios) + `case-convert.ts` (interceptors snake↔camel) | `frontend/lib/api/client.ts`, `frontend/lib/case-convert.ts` |
| 36 | Gerar componentes shadcn/ui necessários via CLI (Button, Input, Form, Card, Table, Dialog, Toast) | `frontend/components/ui/*.tsx` |

### Phase 11: Frontend Auth Feature (depende de Phases 2, 10)

| # | Task | Files |
|---|------|-------|
| 37 | `auth-api.ts` (signup/login/refresh/logout) | `frontend/features/auth/api/auth-api.ts` |
| 38 | `users-api.ts` (invite/accept-invite/list) | `frontend/features/users/api/users-api.ts` |
| 39 | `useAuthStore` (Zustand — user/tenant/access token, logout limpa estado) | `frontend/stores/auth-store.ts` |
| 40 | Hooks TanStack Query (`useSignup`, `useLogin`, `useLogout`) | `frontend/features/auth/hooks/use-auth.ts` |
| 41 | Hooks TanStack Query (`useInviteUser`, `useAcceptInvite`, `useUsersList`) | `frontend/features/users/hooks/use-users.ts` |

### Phase 12: Frontend Pages (depende de Phase 11)

| # | Task | Files |
|---|------|-------|
| 42 | Tela de Signup (RHF + Zod, estados loading/erro/sucesso) | `frontend/app/(auth)/signup/page.tsx`, `frontend/features/auth/components/SignupForm.tsx` |
| 43 | Tela de Login | `frontend/app/(auth)/login/page.tsx`, `frontend/features/auth/components/LoginForm.tsx` |
| 44 | Tela "Usuários" — lista + modal de convite (Admin/Gerente) | `frontend/app/(dashboard)/users/page.tsx`, `frontend/features/users/components/UsersTable.tsx`, `frontend/features/users/components/InviteUserModal.tsx` |
| 45 | Tela de aceite de convite | `frontend/app/invite/[token]/page.tsx`, `frontend/features/auth/components/AcceptInviteForm.tsx` |
| 46 | `middleware.ts` — redireciona não-autenticado / papel sem permissão | `frontend/middleware.ts` |

### Phase 13: Frontend Tests (depende de Phase 12)

| # | Task | Files |
|---|------|-------|
| 47 | Testes de componente Vitest (SignupForm, LoginForm — loading/erro de validação/erro de servidor/sucesso) | `frontend/features/auth/components/__tests__/SignupForm.test.tsx`, `frontend/features/auth/components/__tests__/LoginForm.test.tsx` |
| 48 | Teste E2E Playwright: signup → login → convidar usuário → aceitar convite → login do convidado | `frontend/e2e/iam-flow.spec.ts` |

---

## Parallel vs Sequential

| Parallel Group | Tasks | Why |
|---------------|-------|-----|
| Group A | 1-3 (DB) e 4-7 (Contracts) | Schema e DTOs TS são independentes entre si |
| Group B | 14-16 (Domain Services) e 8-13 (Shared Infra) | Nenhuma depende da outra — services de domínio não tocam Prisma/guards |
| Group C | 34-36 (Frontend Setup) | Roda em paralelo a todo o backend (Phases 3-9) — só precisa das Phases 1-2 prontas antes de consumir tipos reais |

| Sequential | Depends On | Why |
|-----------|-----------|-----|
| Phase 3 (Shared Infra) | Phase 1 | `PrismaService` precisa do client gerado a partir do schema com os models |
| Phase 5 (Repositories) | Phases 1, 3 | Repositories usam os models do schema + `PrismaService` |
| Phase 6 (Audit Log Queue) | Phase 3 | `AuditLogService`/`Processor` dependem de `PrismaService` e da infra compartilhada |
| Phase 7 (Managers) | Phases 2, 4, 5, 6 | Orquestram services de domínio + repositories + fila, usando os tipos de contracts |
| Phase 8 (Controllers) | Phase 7 | Controllers delegam para os Managers |
| Phase 9 (Backend Tests) | Phase 8 | Testes E2E precisam do stack completo |
| Phase 11 (Frontend Auth Feature) | Phases 2, 10 | API calls usam tipos de contracts + `apiClient` |
| Phase 12 (Frontend Pages) | Phase 11 | Páginas consomem os hooks |
| Phase 13 (Frontend Tests) | Phase 12 | Testa os componentes/fluxo já implementados; o E2E Playwright (#48) também precisa do backend rodando (Phase 9 concluída) |

---

## Testing Plan

**Data layer** (Phase 9, #29):
- Insert/read/soft-delete de `Tenant`, `User`, `RefreshToken`
- Unicidade de `document` (tenant) e `email` por `tenant_id`

**Business logic** (Phase 9, #30-31):
- Signup: cria tenant+admin, rejeita documento inválido/duplicado, rejeita senha curta
- Login: token válido, credenciais inválidas, usuário `disabled`/soft-deleted bloqueado (Edge Case 6)
- Refresh: rotação correta; token já usado/revogado é rejeitado (Edge Case 2)
- Invite: gera token com expiração; accept-invite com token expirado ou já aceito é rejeitado sem side effects (Edge Case 3)
- List: retorna só usuários do tenant do requisitante

**API / integration** (Phase 9, #32-33):
- **Isolamento multi-tenant dedicado** (Edge Case 1) — dois tenants, prova de não vazamento
- `RolesGuard` bloqueia papel não autorizado (403)
- Documento/e-mail duplicado retorna 400, não 500 (Edge Case 4)
- Rate limit retorna 429 após N tentativas (Edge Case 5)
- Senha < 8 caracteres rejeitada na validação do DTO (Edge Case 7)

**UI** (Phase 13, #47-48):
- Formulários cobrem loading, erro de validação por campo, erro genérico de servidor, sucesso
- E2E Playwright cobre o fluxo ponta a ponta: signup → convite → aceite → login do convidado

---

## Gate 2 Checklist

**Architecture:**
- [x] Segue Controller → Manager → Repository (backend) e Types → API client → Hooks → Componentes → Páginas (frontend)
- [x] Cada camada só chama a camada abaixo (Controllers não tocam Prisma; Managers não chamam guards)
- [x] Guards/decorators reutilizáveis ficam em `shared/`, não duplicados por módulo — prontos para Clientes/Veículos/OS (Features 3-5)

**Task Breakdown:**
- [x] Todos os arquivos novos e a alterar estão listados
- [x] Tarefas pequenas (1-3 arquivos cada)
- [x] Dependências entre phases explícitas
- [x] Paralelo vs sequencial marcado

**Testing:**
- [x] Data layer planejado
- [x] Business logic planejado (happy path + edge cases da spec)
- [x] API/integration planejado, incluindo o teste dedicado de isolamento multi-tenant exigido pelo épico
- [x] UI planejado
- [x] Todos os 7 edge cases da spec mapeados para um teste
