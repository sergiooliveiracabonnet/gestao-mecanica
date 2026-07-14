# Spec: Setup Monorepo & Infra Base

**Created**: 2026-07-14
**Status**: draft
**Author**: Sergio Oliveira
**Epic**: nucleo-operacional-mvp

---

## Problem

Não existe nenhuma base técnica no projeto ainda (diretório vazio). Sem uma
estrutura de monorepo, ambiente Docker reproduzível e pipeline de qualidade
consistentes, cada uma das próximas 4 features (IAM, Clientes, Veículos, Ordem
de Serviço) começaria do zero — risco real de divergência de padrão entre
módulos e retrabalho quando essas divergências precisarem ser reconciliadas
mais tarde.

## Goal

Qualquer desenvolvedor (hoje, Sergio; no futuro, possíveis colaboradores)
consegue clonar o repositório, rodar um único comando de setup e ter um
ambiente local completo funcionando — Postgres, Redis, backend NestJS
("hello world"), frontend Next.js ("hello world") — sem passos manuais de
configuração. Todo PR aberto depois disso roda lint, typecheck, test e build
automaticamente via CI.

## User Stories

- Como desenvolvedor, quando eu clono o repositório e rodo `docker-compose up`
  + o script de setup, eu tenho um ambiente local completo funcionando (banco,
  cache, backend, frontend), para eu poder começar a construir a Feature 2
  (IAM) imediatamente, sem perder tempo configurando infraestrutura.
- Como desenvolvedor, quando eu abro um Pull Request, eu vejo lint/typecheck/
  test/build rodando automaticamente no GitHub Actions, para eu saber antes do
  merge se quebrei alguma coisa.

## Requirements

### Must-have
- Monorepo com Turborepo + pnpm workspaces configurado (`turbo.json`,
  `pnpm-workspace.yaml`)
- `backend/` — projeto NestJS inicial, com estrutura de pastas
  `src/modules/`, `src/shared/` já criada (vazia, pronta para a Feature 2),
  endpoint `GET /health` funcional
- `frontend/` — projeto Next.js (App Router) inicial, com Tailwind + shadcn/ui
  configurados, uma página inicial simples
- `packages/contracts/` — pacote TS vazio, mas configurado e importável tanto
  pelo backend quanto pelo frontend (valida que o compartilhamento de tipos
  funciona antes de ter DTOs reais)
- `database/prisma/schema.prisma` — datasource (Postgres) e generator
  configurados, extensão `uuid-ossp` habilitada via migration inicial. Sem
  models de negócio (isso é escopo da Feature 2)
- `docker/docker-compose.yml` — serviços Postgres, Redis, backend, frontend,
  NGINX (proxy reverso básico), todos com healthcheck
- `docker/nginx/` — configuração mínima de proxy (rotas `/api` → backend,
  demais → frontend)
- Scripts em `scripts/`: setup inicial (`setup.sh`/`setup.ps1`, já que o
  ambiente de desenvolvimento principal é Windows), seed vazio (placeholder)
- `.env.example` na raiz e em `backend/`/`frontend/` documentando todas as
  variáveis necessárias
- GitHub Actions (`.github/workflows/ci.yml`): lint + typecheck + test + build
  em todo PR, usando cache do Turborepo
- `docs/` já com a estrutura de subpastas (`architecture/`, `api/`,
  `roadmap/`) e os documentos de arquitetura/epic já produzidos movidos/
  referenciados corretamente
- README na raiz com instruções de setup local

### Nice-to-have
- Husky + commitlint + Conventional Commits configurados (mencionado nas
  regras do usuário, mas não bloqueia a Feature 2 se ficar para depois)
- Prettier + ESLint compartilhados via config única em `packages/`

### Out of scope
- Deploy automático para Railway/AWS (fica para quando houver uma feature com
  valor de negócio real para deployar, a partir da Feature 2)
- Qualquer model de domínio no Prisma (Tenant, User, Customer, etc.) — Feature 2
  em diante
- Autenticação, RBAC, qualquer lógica de negócio
- Testcontainers/E2E reais (a esteira de teste é criada vazia; os primeiros
  testes de verdade chegam com a Feature 2)
- Terraform/infra AWS (`infra/` fica só como diretório placeholder com um
  README explicando o que vai entrar depois)

## Data Model

Nenhum model de domínio nesta feature. Único artefato de banco:
`schema.prisma` com datasource/generator e a migration inicial que habilita a
extensão `uuid-ossp` (necessária para `uuid_generate_v4()` usado por todas as
tabelas futuras).

## API Changes

Único endpoint desta feature:

`GET /health` (backend) — sem autenticação, sem `tenant_id`, retorna:
```json
{ "status": "ok", "timestamp": "2026-07-14T12:00:00Z" }
```
Usado por Docker healthcheck e, futuramente, por ECS/Railway.

## UI Changes

Página inicial do Next.js (`/`) exibindo apenas um placeholder confirmando que
o frontend está rodando e consegue chamar `GET /health` do backend (prova de
que a comunicação entre os dois está funcionando). Sem design definitivo —
isso é responsabilidade da Feature 2 em diante, quando telas reais existirem.

## Edge Cases

1. **Portas locais já em uso** (5432 Postgres, 6379 Redis, 3000/3001 apps) —
   `docker-compose.yml` deve documentar as portas no `.env.example` e permitir
   override fácil, para não quebrar em máquinas com outros serviços rodando.
2. **Ambiente Windows vs CI Linux** — o dev principal é Windows (PowerShell/Git
   Bash); os scripts de setup precisam funcionar em ambos os shells, e o CI
   (GitHub Actions, Linux) não pode depender de nada específico de Windows.
3. **Lockfile drift** — `pnpm-lock.yaml` desatualizado localmente vs CI causa
   builds inconsistentes; CI deve rodar `pnpm install --frozen-lockfile` e
   falhar explicitamente se o lockfile estiver desatualizado, em vez de
   silenciosamente resolver diferente.
4. **Cache do Turborepo mascarando falha real** — cache mal invalidado pode
   fazer o CI reportar sucesso em build quebrado; pipeline deve usar
   remote/local cache apenas para acelerar, nunca pular etapas de lint/test.
5. **Variáveis de ambiente ausentes** — se alguém sobe o `docker-compose` sem
   copiar `.env.example` para `.env`, os serviços devem falhar rápido e com
   mensagem clara (não silenciosamente usar defaults inseguros).

## Testing Criteria

**Happy path:**
- `docker-compose up` sobe Postgres, Redis, backend e frontend sem erro
- `GET /health` retorna 200 com o payload esperado
- Frontend carrega e exibe confirmação de que o backend respondeu
- `pnpm turbo build` e `pnpm turbo lint` passam localmente e no CI

**Edge cases:**
- CI falha (não passa silenciosamente) se o lockfile estiver desatualizado
- `docker-compose up` com portas ocupadas produz erro claro, não trava
  silenciosamente
- Subir os serviços sem `.env` configurado falha com mensagem explícita,
  listando a variável faltante

## Dependencies

- Docker Desktop instalado localmente (pré-requisito do ambiente, não desta
  feature)
- Node.js + pnpm instalados localmente
- Nenhuma dependência de features anteriores (esta é a Feature 1, a base de
  todas as outras)
