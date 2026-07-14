# Plan: Setup Monorepo & Infra Base

**Spec**: .planning/specs/setup-monorepo-infra-base.md
**Epic**: nucleo-operacional-mvp
**Created**: 2026-07-14
**Status**: draft

---

## Stack Detection

Repositório greenfield — nenhum `package.json`/`build.gradle.kts` existe ainda.
Esta é exatamente a feature que cria a base do stack (NestJS + Next.js +
Prisma), conforme `docs/superpowers/specs/2026-07-14-arquitetura-mvp-design.md`.
Modo: **full-stack plan** (infraestrutura, não regra de negócio).

---

## Components

| Component | Type | Purpose |
|-----------|------|---------|
| Root workspace config | Turborepo + pnpm | Orquestra build/lint/test/dev de todos os pacotes |
| `backend` app | NestJS | API — só `HealthController` nesta feature |
| `frontend` app | Next.js (App Router) | UI — só página inicial de verificação nesta feature |
| `packages/contracts` | Pacote TS | DTOs/tipos compartilhados BE↔FE (vazio, só configurado) |
| Prisma base config | `database/prisma/schema.prisma` | Datasource/generator + extensão `uuid-ossp`, sem models |
| Docker Compose | `docker/docker-compose.yml` | Sobe Postgres, Redis, backend, frontend, NGINX localmente |
| NGINX config | `docker/nginx/` | Proxy reverso `/api` → backend, resto → frontend |
| CI workflow | `.github/workflows/ci.yml` | lint + typecheck + test + build em todo PR |
| Setup scripts | `scripts/` | Setup inicial (bash + PowerShell), seed placeholder |

---

## File Locations

| File | Location | Purpose |
|------|----------|---------|
| `turbo.json` | raiz | Pipeline Turborepo (build/lint/test/dev) |
| `pnpm-workspace.yaml` | raiz | Declara `backend`, `frontend`, `packages/*` |
| `package.json` | raiz | Scripts raiz (`turbo run ...`), devDependencies compartilhadas |
| `.gitignore` | raiz | `node_modules`, `.env`, `dist`, `.next`, `.turbo` |
| `.env.example` | raiz | Variáveis compartilhadas (ex: `DATABASE_URL`, `REDIS_URL`) |
| `README.md` | raiz | Instruções de setup local |
| `backend/package.json` | `backend/` | Deps NestJS |
| `backend/src/main.ts` | `backend/src/` | Bootstrap NestJS |
| `backend/src/app.module.ts` | `backend/src/` | Módulo raiz, importa `HealthModule` |
| `backend/src/health/health.controller.ts` | `backend/src/health/` | `GET /health` |
| `backend/src/health/health.module.ts` | `backend/src/health/` | Módulo do health check |
| `backend/src/modules/` | `backend/src/modules/` | Vazio — pronto para IAM/Clientes/Veículos/OS (Features 2-5) |
| `backend/src/shared/` | `backend/src/shared/` | Vazio — pronto para tenant-context, filters, guards |
| `backend/Dockerfile` | `backend/` | Build de produção do NestJS |
| `backend/.env.example` | `backend/` | Variáveis específicas do backend |
| `frontend/package.json` | `frontend/` | Deps Next.js + Tailwind + shadcn/ui |
| `frontend/app/page.tsx` | `frontend/app/` | Página inicial, chama `GET /health` |
| `frontend/app/layout.tsx` | `frontend/app/` | Layout raiz |
| `frontend/tailwind.config.ts` | `frontend/` | Config Tailwind |
| `frontend/components.json` | `frontend/` | Config shadcn/ui |
| `frontend/Dockerfile` | `frontend/` | Build de produção do Next.js |
| `frontend/.env.example` | `frontend/` | `NEXT_PUBLIC_API_URL` etc. |
| `packages/contracts/package.json` | `packages/contracts/` | Pacote TS compartilhado |
| `packages/contracts/src/index.ts` | `packages/contracts/src/` | Barrel vazio (export placeholder) |
| `packages/contracts/tsconfig.json` | `packages/contracts/` | Config TS do pacote |
| `database/prisma/schema.prisma` | `database/prisma/` | Datasource + generator, sem models |
| `database/prisma/migrations/.../migration.sql` | `database/prisma/migrations/` | Habilita `uuid-ossp` |
| `docker/docker-compose.yml` | `docker/` | Postgres, Redis, backend, frontend, nginx |
| `docker/nginx/nginx.conf` | `docker/nginx/` | Proxy reverso |
| `.github/workflows/ci.yml` | `.github/workflows/` | Pipeline de CI |
| `scripts/setup.sh` | `scripts/` | Setup local (bash/Git Bash) |
| `scripts/setup.ps1` | `scripts/` | Setup local (PowerShell) |
| `scripts/seed.ts` | `scripts/` | Placeholder vazio (seed real chega na Feature 2) |

No files to change — todos os arquivos desta feature são novos (greenfield).

---

## Tasks

### Phase 1: Monorepo Root Setup

| # | Task | Files |
|---|------|-------|
| 1 | Criar `package.json` raiz, `pnpm-workspace.yaml`, `.gitignore` | `package.json`, `pnpm-workspace.yaml`, `.gitignore` |
| 2 | Criar `turbo.json` com pipeline (`build`, `lint`, `test`, `dev`) | `turbo.json` |
| 3 | Criar `.env.example` raiz com todas as variáveis documentadas | `.env.example` |

### Phase 2: Backend Skeleton (depende de Phase 1)

| # | Task | Files |
|---|------|-------|
| 4 | Inicializar projeto NestJS em `backend/`, configurar `package.json`/`tsconfig.json` | `backend/package.json`, `backend/tsconfig.json` |
| 5 | Criar `main.ts` + `app.module.ts` | `backend/src/main.ts`, `backend/src/app.module.ts` |
| 6 | Criar `HealthModule`/`HealthController` (`GET /health`) | `backend/src/health/health.controller.ts`, `backend/src/health/health.module.ts` |
| 7 | Criar estrutura vazia `src/modules/` e `src/shared/` (com `.gitkeep`) | `backend/src/modules/.gitkeep`, `backend/src/shared/.gitkeep` |
| 8 | Criar `backend/Dockerfile` e `backend/.env.example` | `backend/Dockerfile`, `backend/.env.example` |

### Phase 3: Frontend Skeleton (depende de Phase 1, paralelo à Phase 2)

| # | Task | Files |
|---|------|-------|
| 9 | Inicializar projeto Next.js (App Router) em `frontend/` | `frontend/package.json`, `frontend/tsconfig.json` |
| 10 | Configurar Tailwind + shadcn/ui | `frontend/tailwind.config.ts`, `frontend/components.json` |
| 11 | Criar `layout.tsx` + `page.tsx` (chama `GET /health` do backend) | `frontend/app/layout.tsx`, `frontend/app/page.tsx` |
| 12 | Criar `frontend/Dockerfile` e `frontend/.env.example` | `frontend/Dockerfile`, `frontend/.env.example` |

### Phase 4: Contracts Package (depende de Phase 1, paralelo às Phases 2-3)

| # | Task | Files |
|---|------|-------|
| 13 | Criar pacote `packages/contracts` (vazio, mas importável por backend e frontend) | `packages/contracts/package.json`, `packages/contracts/tsconfig.json`, `packages/contracts/src/index.ts` |
| 14 | Referenciar `@oficina/contracts` como dependência em `backend/package.json` e `frontend/package.json`, validar import | `backend/package.json`, `frontend/package.json` |

### Phase 5: Database Base Config (depende de Phase 1, paralelo às Phases 2-4)

| # | Task | Files |
|---|------|-------|
| 15 | Criar `database/prisma/schema.prisma` (datasource + generator, sem models) | `database/prisma/schema.prisma` |
| 16 | Criar migration inicial habilitando `uuid-ossp` | `database/prisma/migrations/0_init_extensions/migration.sql` |

### Phase 6: Docker Compose & NGINX (depende de Phases 2, 3, 5)

| # | Task | Files |
|---|------|-------|
| 17 | Criar `docker/docker-compose.yml` (postgres, redis, backend, frontend com healthcheck) | `docker/docker-compose.yml` |
| 18 | Criar `docker/nginx/nginx.conf` (proxy `/api` → backend, resto → frontend) e referenciar no compose | `docker/nginx/nginx.conf`, `docker/docker-compose.yml` |

### Phase 7: CI Pipeline (depende de Phases 2, 3, 4)

| # | Task | Files |
|---|------|-------|
| 19 | Criar `.github/workflows/ci.yml` (lint + typecheck + test + build, cache Turborepo, `pnpm install --frozen-lockfile`) | `.github/workflows/ci.yml` |

### Phase 8: Scripts, Docs e README (depende de Phases 1-7)

| # | Task | Files |
|---|------|-------|
| 20 | Criar `scripts/setup.sh` e `scripts/setup.ps1` (instala deps, copia `.env.example`→`.env`, sobe docker-compose) | `scripts/setup.sh`, `scripts/setup.ps1` |
| 21 | Criar `scripts/seed.ts` placeholder vazio | `scripts/seed.ts` |
| 22 | Criar `README.md` raiz com instruções de setup | `README.md` |
| 23 | Confirmar estrutura `docs/architecture/`, `docs/api/`, `docs/roadmap/` e referenciar spec/epic existentes | `docs/architecture/.gitkeep`, `docs/api/.gitkeep`, `docs/roadmap/.gitkeep` |

### Phase 9: Verification (depende de todas as anteriores)

| # | Task | Files |
|---|------|-------|
| 24 | Rodar `docker-compose up`, validar `GET /health`, validar frontend chamando backend, validar `pnpm turbo build/lint/test` local e edge cases da spec | — (verificação manual, sem novo arquivo) |

---

## Parallel vs Sequential

| Parallel Group | Tasks | Why |
|---|---|---|
| Group A | 4-8 (backend), 9-12 (frontend), 13-14 (contracts), 15-16 (database) | Pacotes independentes dentro do workspace, só dependem da Phase 1 |

| Sequential | Depends On | Why |
|---|---|---|
| Phase 1 | — | Base do workspace, tudo mais depende dela |
| Phase 6 (Docker Compose) | Phases 2, 3, 5 | Precisa que backend/frontend/database já existam para referenciar |
| Phase 7 (CI) | Phases 2, 3, 4 | Precisa de scripts de lint/test/build já funcionando em cada pacote |
| Phase 8 (Scripts/README) | Phases 1-7 | Documenta o setup completo |
| Phase 9 (Verification) | Phases 1-8 | Só valida depois que tudo existe |

---

## Testing Plan

Sem regra de negócio nesta feature — os "testes" validam a infraestrutura em
si, mapeados diretamente aos edge cases da spec:

- **Infra (happy path):** `docker-compose up` sobe todos os serviços com
  healthcheck verde; `GET /health` retorna `200` com o payload documentado na
  spec; frontend carrega e exibe confirmação da chamada ao backend;
  `pnpm turbo build`/`lint`/`test` passam localmente e no CI
- **Edge case — portas em uso:** subir com uma porta ocupada produz erro claro
  do Docker, documentado no README (não trava silenciosamente)
- **Edge case — Windows vs CI Linux:** `scripts/setup.ps1` testado no ambiente
  de desenvolvimento (Windows) e `scripts/setup.sh` validado equivalente;
  CI (Linux) não depende de nenhum dos dois scripts, só de `pnpm`/`turbo`
  diretamente
- **Edge case — lockfile drift:** CI configurado com
  `pnpm install --frozen-lockfile`, falha explícita se desatualizado
  (validado propositalmente desatualizando o lockfile numa branch de teste)
- **Edge case — cache do Turborepo mascarando falha:** pipeline de CI roda
  lint/test sempre (cache só acelera build), validado rodando CI duas vezes
  seguidas e conferindo que uma falha introduzida propositalmente é sempre
  detectada
- **Edge case — `.env` ausente:** subir `docker-compose` sem copiar
  `.env.example` → `.env` produz falha explícita listando a variável
  faltante (validado manualmente removendo o `.env`)

---

## Gate 2 Checklist

**Architecture:**
- [x] Segue a arquitetura aprovada na spec de arquitetura (seções 3 e 9)
- [x] Estrutura de camadas do backend (`modules/`, `shared/`) já criada vazia,
      pronta para a Feature 2 respeitar `Controller → Manager → Repository`
- [x] Componentes nos diretórios corretos (`backend/`, `frontend/`,
      `packages/contracts/`, `database/`, `docker/`, `scripts/`)

**Task Breakdown:**
- [x] Todos os arquivos novos listados com localização
- [x] Nenhum arquivo existente para alterar (greenfield)
- [x] Cada task é pequena (1-3 arquivos, um commit)
- [x] Dependências entre tasks/phases explícitas
- [x] Paralelo vs sequencial marcado

**Testing:**
- [x] Testes de infraestrutura (equivalente a "data layer" nesta feature) —
      migration de extensão, docker-compose healthcheck
- [x] "Business logic" N/A nesta feature (sem regra de negócio)
- [x] Testes de API/integração — `GET /health`
- [x] Testes de UI — página inicial chamando o backend
- [x] Todos os edge cases da spec cobertos no plano de teste

---

## Next Steps

Plano pequeno o suficiente (24 tasks, mas mecânicas e de baixo risco,
agrupáveis em ~9 commits por fase) para ir direto para
`/spartan:build setup-monorepo-infra-base`.
