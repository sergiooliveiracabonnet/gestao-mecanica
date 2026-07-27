# Plano: Hardening de Segurança — Autenticação e Infraestrutura HTTP

**Spec**: .planning/specs/hardening-seguranca-auth.md
**Epic**: none
**Created**: 2026-07-27
**Status**: draft

---

## Stack

Backend puro (NestJS + Prisma), mais bumps de dependência isolados no
frontend e na raiz do monorepo (sem código de aplicação novo no frontend).

---

## Arquitetura

### Componentes

| Componente | Tipo | Propósito |
|---|---|---|
| `computeLockoutDurationMs` | Função pura (nova) | Calcula a duração do lockout progressivo a partir do número de tentativas falhadas — testável sem DB, mesmo padrão de `service-order-state-machine.ts` (lógica pura separada do orquestrador). |
| `UserRepository` | Repository (modificado) | Ganha `incrementFailedAttempts`, `setLockedUntil`, `resetFailedAttempts` — operações atômicas via `unscoped` (login roda sem tenant context). |
| `AuthManager.login` | Manager (modificado) | Orquestra: checa lockout ativo → verifica senha → em caso de falha, incrementa e decide lockout via `computeLockoutDurationMs` → em caso de sucesso, reseta o contador. |
| `JwtConfigModule` | Module (modificado) | Ganha a guarda de `JWT_SECRET` fraco/padrão em produção. |
| `configureApp` (bootstrap.ts) | Function (modificada) | Ganha `helmet()` como primeiro middleware. |
| `AuthController.refresh` | Controller (modificado) | Ganha `@Throttle(AUTH_THROTTLE)`. |

### Localização dos arquivos

| Arquivo | Local | Propósito |
|---|---|---|
| `auth-lockout.ts` | `backend/src/modules/iam/` | Constantes + função pura de cálculo de duração do lockout |
| `auth-lockout.spec.ts` | `backend/src/modules/iam/` | Testes da função pura |
| `10_auth_lockout/migration.sql` | `database/prisma/migrations/` | Migration das 2 colunas novas em `users` |

### Arquivos a alterar

| Arquivo | O que muda | Por quê |
|---|---|---|
| `database/prisma/schema.prisma` | `model User` ganha `failedLoginAttempts Int @default(0)` e `lockedUntil DateTime?` | Requisito 1 da spec |
| `backend/src/modules/iam/repositories/user.repository.ts` | 3 métodos novos: `incrementFailedAttempts`, `setLockedUntil`, `resetFailedAttempts` (todos via `prisma.unscoped`, mesmo padrão de `byEmail`) | Login roda sem tenant context — `client` não serve aqui |
| `backend/src/modules/iam/managers/auth.manager.ts` | `login()` ganha a lógica de lockout (checar antes de verificar senha, incrementar/reset depois) | Requisito 1 |
| `backend/src/modules/iam/managers/auth.manager.spec.ts` | Novos casos de teste (ver Plano de Testes) | Cobertura do requisito 1 |
| `backend/src/shared/jwt/jwt-config.module.ts` | `useFactory` valida o secret quando `NODE_ENV=production` | Requisito 2 |
| `backend/src/bootstrap.ts` | `app.use(helmet())` como primeira linha de `configureApp` | Requisito 3 |
| `backend/package.json` | Adiciona dependência `helmet` | Requisito 3 |
| `backend/src/modules/iam/controllers/auth.controller.ts` | `@Throttle(AUTH_THROTTLE)` no endpoint `refresh` | Requisito 4 |
| `frontend/package.json` | `next` e `postcss` já têm range `^` que cobre a versão corrigida — `pnpm update` resolve, sem editar o número manualmente | Requisito 5 |
| `package.json` (raiz) | Novo bloco `pnpm.overrides` fixando `tar@>=7.5.21` e `brace-expansion@>=5.0.8` (transitivos, sem entrada direta em nenhum `package.json`) | Requisito 5 |

## Ponto de integração

Nenhum — todo o trabalho é backend + infraestrutura de build. O frontend
não muda comportamento, só a versão de dependências internas
(next/postcss/brace-expansion não têm mudança de API relevante entre os
patches em questão — são todos fixes de segurança, não breaking changes).

---

## Fases e Tarefas

### Fase 1: Banco de dados (sem dependências)

| # | Tarefa | Arquivos |
|---|---|---|
| 1 | Adicionar `failedLoginAttempts`/`lockedUntil` ao `model User` e gerar a migration `10_auth_lockout` | `database/prisma/schema.prisma`, `database/prisma/migrations/10_auth_lockout/migration.sql` |

### Fase 2: Lógica de lockout — função pura (paralela à Fase 1)

| # | Tarefa | Arquivos |
|---|---|---|
| 2 | Teste de `computeLockoutDurationMs`: 5→1min, 10→5min, 15→15min, 20→30min, 25 e 30→60min (teto) | `backend/src/modules/iam/auth-lockout.spec.ts` |
| 3 | Implementar `computeLockoutDurationMs` + constantes pra passar o teste | `backend/src/modules/iam/auth-lockout.ts` |

### Fase 3: Repository (depende da Fase 1)

| # | Tarefa | Arquivos |
|---|---|---|
| 4 | Adicionar `incrementFailedAttempts`, `setLockedUntil`, `resetFailedAttempts` no `UserRepository` (todos via `unscoped`, incremento atômico com `{ increment: 1 }`) | `backend/src/modules/iam/repositories/user.repository.ts` |

### Fase 4: Integração no AuthManager (depende das Fases 2 e 3)

| # | Tarefa | Arquivos |
|---|---|---|
| 5 | Testes do `AuthManager.login`: lockout ativo bloqueia sem tentar senha; senha errada incrementa e não vaza info; 5ª falha trava a conta; sucesso reseta o contador; tentativa durante lockout não estende a duração | `backend/src/modules/iam/managers/auth.manager.spec.ts` |
| 6 | Implementar a lógica em `AuthManager.login()` pra passar os testes | `backend/src/modules/iam/managers/auth.manager.ts` |

### Fase 5: Guarda de JWT_SECRET, helmet, throttle no refresh (paralela à Fase 4 — arquivos isolados)

| # | Tarefa | Arquivos |
|---|---|---|
| 7 | Teste: `JwtConfigModule` lança erro com secret fraco + `NODE_ENV=production`; não lança em outros ambientes | `backend/src/shared/jwt/jwt-config.module.spec.ts` (novo) |
| 8 | Implementar a guarda em `jwt-config.module.ts` pra passar o teste | `backend/src/shared/jwt/jwt-config.module.ts` |
| 9 | Adicionar `helmet` como dependência e aplicar em `configureApp()` | `backend/package.json`, `backend/src/bootstrap.ts` |
| 10 | Adicionar `@Throttle(AUTH_THROTTLE)` no endpoint `refresh` | `backend/src/modules/iam/controllers/auth.controller.ts` |

### Fase 6: Dependências vulneráveis (independente, pode rodar em paralelo a tudo acima)

| # | Tarefa | Arquivos |
|---|---|---|
| 11 | `pnpm update next postcss` no frontend; adicionar `pnpm.overrides` pra `tar`/`brace-expansion` na raiz; rodar `pnpm install`, build de frontend e backend, suíte de testes completa pra confirmar que nada quebrou | `frontend/package.json`, `package.json` (raiz), `pnpm-lock.yaml` |

### Paralelo vs sequencial

| Grupo paralelo | Tarefas | Por quê |
|---|---|---|
| Grupo A | 1, 2 | Migration e função pura não dependem uma da outra |
| Grupo B | 7, 8 (depois de A) | Arquivo isolado (`jwt-config.module.ts`), sem relação com o resto |
| Grupo C | 9, 10 (a qualquer momento) | `bootstrap.ts` e `auth.controller.ts` são triviais e isolados |
| Grupo D | 11 (a qualquer momento) | Bump de dependência não tem relação de código com o resto |

| Sequencial | Depende de | Por quê |
|---|---|---|
| Tarefa 4 | Tarefa 1 | Repository precisa das colunas já existirem no schema gerado |
| Tarefa 5, 6 | Tarefas 3, 4 | Manager usa a função pura e os métodos novos do repository |

---

## Plano de testes

- **Função pura** (`auth-lockout.spec.ts`): todos os 5 degraus da progressão
  + o teto em 60min pra qualquer valor acima do 5º ciclo.
- **Repository**: não precisa de teste isolado novo — os 3 métodos são
  triviais (um `UPDATE` cada) e são exercitados indiretamente pelos testes
  do `AuthManager` abaixo. Segue o padrão do projeto de não duplicar
  cobertura entre camadas quando a camada de baixo é trivial.
- **AuthManager.login** (estende `auth.manager.spec.ts` existente):
  - Happy path: login correto de primeira, contador seguem 0.
  - Senha errada não revela nada diferente do erro genérico já existente.
  - 5ª tentativa errada seguida trava a conta (mock do repository
    confirma `setLockedUntil` chamado com o timestamp certo).
  - Tentativa (mesmo com senha certa) durante o lockout retorna o erro
    genérico sem chamar `passwordService.verify` — Edge Case 2 da spec
    (não revalida a senha, não estende a duração).
  - Login bem-sucedido depois de algumas falhas (mas antes de travar)
    chama `resetFailedAttempts`.
  - Email inexistente não chama nenhum método de lockout (Edge Case 3).
- **JwtConfigModule**: boot com `NODE_ENV=production` + secret fraco
  lança; boot com `NODE_ENV=production` + secret forte não lança; boot
  com `NODE_ENV=development`/`test` + secret fraco não lança.
- **Verificação manual** (sem teste automatizado — infra, não lógica):
  - Resposta HTTP de qualquer endpoint inclui os headers do helmet.
  - `/auth/refresh` retorna 429 depois de 5 chamadas em 60s.
  - `pnpm audit --prod` roda de novo no final confirmando que os itens do
    requisito 5 saíram da lista (ou documentar os que restarem e por quê).

---

## Gate 2 — Checklist

**Arquitetura:**
- [x] Segue Controller → Manager → Repository (lógica de lockout fica no
  Manager, não no Controller nem no Repository)
- [x] Função pura de cálculo isolada, sem dependência de DB — testável
  sem mocks pesados
- [x] Repository só expõe operações atômicas, sem decisão de negócio
  (quando travar é decisão do Manager)

**Divisão de tarefas:**
- [x] Todos os arquivos a alterar estão listados
- [x] Todos os arquivos novos estão listados com localização
- [x] Cada tarefa é pequena (1-3 arquivos)
- [x] Dependências entre tarefas estão claras
- [x] Tarefas paralelas vs sequenciais marcadas

**Testes:**
- [x] Teste da função pura planejado
- [x] Testes de negócio (Manager) planejados, cobrindo os edge cases da
  spec
- [x] Teste de infraestrutura (JwtConfigModule) planejado
- [x] Verificação manual listada pra itens que não fazem sentido como
  teste unitário (headers HTTP, rate limit end-to-end, audit de
  dependências)

Gate 2 passou.
