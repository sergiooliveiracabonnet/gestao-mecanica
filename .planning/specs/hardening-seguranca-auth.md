# Spec: Hardening de Segurança — Autenticação e Infraestrutura HTTP

**Created**: 2026-07-27
**Status**: draft
**Author**: Sergio Oliveira
**Epic**: none

---

## Problem

Uma auditoria de segurança defensiva no backend (NestJS + Prisma + Postgres)
encontrou 4 lacunas concretas de proteção — nenhuma delas crítica isolada,
mas juntas deixam a aplicação exposta a força bruta de credenciais, deploy
acidental com segredo fraco, e ausência dos headers HTTP de segurança
padrão do ecossistema Node. Além disso, o `pnpm audit` encontrou
dependências desatualizadas com CVEs conhecidos (SSRF/DoS no Next.js,
leitura arbitrária de arquivo no PostCSS, DoS no brace-expansion).

## Goal

Fechar as lacunas identificadas sem alterar comportamento para usuários
legítimos: login/refresh continuam funcionando normalmente dentro do uso
esperado, e a aplicação recusa subir em produção com configuração insegura
em vez de subir silenciosamente vulnerável.

## User Stories

- Como operador da oficina, meu login continua funcionando normalmente
  mesmo que eu erre a senha uma ou duas vezes, mas se alguém tentar
  adivinhar minha senha repetidamente, a conta trava temporariamente antes
  que o ataque tenha chance de ter sucesso.
- Como responsável técnico pelo deploy, se eu esquecer de trocar o
  `JWT_SECRET` padrão de desenvolvimento antes de subir em produção, a
  aplicação recusa iniciar em vez de rodar vulnerável silenciosamente.
- Como qualquer usuário do sistema, minhas respostas HTTP vêm com os
  headers de segurança padrão (proteção contra clickjacking, MIME
  sniffing, etc.), reduzindo a superfície de ataque do navegador.

## Requirements

### Must-have

1. **Lockout progressivo por conta** (achado #2, MÉDIO):
   - Contador `failedLoginAttempts` por usuário, incrementado a cada senha
     incorreta em `POST /auth/login`.
   - Ao atingir 5 tentativas falhadas consecutivas, a conta entra em
     lockout temporário. Duração progressiva por ciclo de 5 tentativas:
     1 min → 5 min → 15 min → 30 min → 60 min (teto em 60 min, não cresce
     mais depois disso).
   - Login bem-sucedido zera `failedLoginAttempts` e limpa `lockedUntil`.
   - Login enquanto em lockout retorna o mesmo erro genérico de
     "credenciais inválidas" usado hoje (não revela que a conta está
     travada nem por quanto tempo — evita enumeração de contas/timing
     info pro atacante), mas loga o evento server-side para auditoria.
   - Aplica-se por **conta** (email), não por IP — complementa o rate
     limit por IP já existente (`AUTH_THROTTLE`), não o substitui.

2. **Guarda de `JWT_SECRET` fraco em produção** (achado #1, MÉDIO):
   - Ao bootar com `NODE_ENV=production`, se `JWT_SECRET` for o valor
     padrão de desenvolvimento (`dev_only_change_me`) ou tiver menos de
     32 caracteres, a aplicação lança erro e recusa iniciar.
   - Em qualquer outro `NODE_ENV`, comportamento inalterado (permite o
     valor de dev).

3. **Headers de segurança HTTP via `helmet`** (achado #3, MÉDIO):
   - Adicionar o pacote `helmet` e aplicá-lo globalmente em `main.ts`,
     antes de qualquer outro middleware.
   - Configuração padrão do helmet é suficiente (não é uma API que serve
     HTML para o público geral customizar CSP não é necessário agora).

4. **Rate limit no `/auth/refresh`** (achado #4, BAIXO):
   - Aplicar o mesmo `@Throttle(AUTH_THROTTLE)` já usado em
     signup/login/accept-invite.

5. **Atualização de dependências vulneráveis** (via `pnpm audit`):
   - `next` → `>=15.5.21` (corrige SSRF e DoS conhecidos).
   - `postcss` → `>=8.5.18` (corrige leitura arbitrária de arquivo via
     sourcemap).
   - `brace-expansion` → `>=5.0.8` (corrige DoS).
   - `tar` (transitivo via `bcrypt`) → `>=7.5.21` via override do pnpm —
     risco real baixo (só usado em build/postinstall, não em runtime),
     mas trava a versão mesmo assim já que o fix é trivial.
   - Rodar a suíte de testes e o build de frontend/backend depois de cada
     bump pra confirmar que nada quebrou.

### Nice-to-have

- Notificar o usuário por algum canal quando a conta for travada (fora de
  escopo agora — não há sistema de e-mail transacional implementado
  ainda neste projeto).

### Out of scope

- CAPTCHA ou verificação humana adicional no login.
- MFA (o campo `mfaEnabled`/`mfaSecret` já existe no schema, mas
  implementar o fluxo de MFA é uma feature própria, não faz parte deste
  hardening).
- CSP customizado/relatórios de violação — a config padrão do helmet
  cobre o essencial (esta é uma API JSON, não uma página servindo HTML
  de terceiros).
- Rate limiting distribuído/Redis-based (o `@nestjs/throttler` atual usa
  memória local — aceitável para o tamanho atual da aplicação; escalar
  isso é um problema de infraestrutura futuro, não de segurança imediata).
- Revisão de dependências de dev-only (ex: Playwright, ferramentas de
  teste) — o audit rodou só com `--prod`.

## Data Model

Alteração na tabela `users` (`database/prisma/schema.prisma`, `model User`):

```prisma
model User {
  // ...campos existentes...
  failedLoginAttempts Int       @default(0) @map("failed_login_attempts")
  lockedUntil         DateTime? @map("locked_until") @db.Timestamptz
}
```

Nova migration em `database/prisma/migrations/10_auth_lockout/` (segue a
numeração sequencial já usada: `9_appointments` foi a última):

```sql
ALTER TABLE users
  ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN locked_until TIMESTAMPTZ;
```

Sem índice adicional necessário — sempre lida junto com a busca por
`email` que já existe (`idx` em `email`).

## API Changes

Nenhum endpoint novo. Comportamento alterado, contrato de resposta
inalterado:

- `POST /api/v1/auth/login`: mesma resposta de erro genérica
  (`INVALID_CREDENTIALS` ou equivalente já usado hoje) tanto para senha
  errada quanto para conta travada — sem vazar qual dos dois casos
  ocorreu.
- `POST /api/v1/auth/refresh`: ganha `@Throttle(AUTH_THROTTLE)`, sem
  mudança de contrato — só passa a retornar 429 mais cedo sob abuso.

## Edge Cases

1. **Usuário erra a senha, acerta antes de travar** — contador zera no
   login bem-sucedido; não deve travar por acúmulo de tentativas antigas
   de dias diferentes (sem janela de tempo — é sempre "5 falhas
   consecutivas desde o último sucesso").
2. **Conta trava, usuário tenta de novo durante o lockout** — cada
   tentativa durante o lockout não deve resetar nem estender a duração já
   definida (evita que um atacante mantenha a conta travada
   indefinidamente reenviando requisições); só conta como nova tentativa
   falha (incrementando o contador) depois que `lockedUntil` expirar.
3. **Conta com email inexistente** — não deve revelar se o email existe
   ou não (mesmo erro genérico); não aplica lockout a um email
   inexistente (não há conta pra travar), mas o rate limit por IP
   continua valendo igual.
4. **`JWT_SECRET` fraco em ambiente que não é produção** (dev, test) —
   não deve travar o boot; só produção é bloqueada.
5. **Migration roda em banco com usuários já existentes** — as duas
   colunas novas têm `DEFAULT 0`/`NULL`, então usuários existentes
   começam com 0 tentativas falhadas e sem lockout, sem precisar de
   backfill.
6. **Bump de dependência quebra o build** — cada bump é testado
   isoladamente (build + suíte de testes) antes do commit; se algum
   quebrar, documentar e decidir se vale a pena um workaround ou esperar
   uma versão patch mais estável.

## Testing Criteria

**Happy path:**
- Login com credenciais corretas na primeira tentativa funciona
  normalmente, contador permanece 0.
- App inicia normalmente com `JWT_SECRET` forte em produção e com o
  valor de dev em qualquer outro ambiente.
- Respostas HTTP incluem os headers do helmet (`X-Content-Type-Options`,
  `X-Frame-Options`, etc.).

**Edge cases:**
- 5 tentativas de senha errada seguidas travam a conta; a 6ª tentativa
  (mesmo com senha certa) retorna o erro genérico sem autenticar.
- Login bem-sucedido após algumas tentativas erradas (mas antes de
  travar) zera o contador.
- Segundo ciclo de 5 falhas (depois do primeiro lockout expirar) usa a
  duração progressiva seguinte (5 min, não 1 min de novo — ou define-se
  que reinicia do zero após lockout cumprido; a spec assume progressão
  contínua até um evento de sucesso zerar tudo).
- Tentativa de login durante o lockout não estende a duração.
- App com `NODE_ENV=production` e `JWT_SECRET=dev_only_change_me` falha
  ao iniciar com mensagem clara.
- App com `NODE_ENV=production` e `JWT_SECRET` curto (< 32 chars) falha
  ao iniciar.
- `POST /auth/refresh` retorna 429 após exceder o limite do
  `AUTH_THROTTLE`.

## Dependencies

- Nenhuma dependência de outras features — trabalho isolado de
  infraestrutura/segurança sobre o módulo de auth (IAM) já existente e
  concluído.
- Requer rodar a migration nova antes do deploy (padrão já seguido pelo
  projeto).
