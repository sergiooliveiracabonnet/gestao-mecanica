# Spec: IAM (Tenant, Auth, RBAC fixo)

**Created**: 2026-07-16
**Status**: draft
**Author**: Sergio Oliveira
**Epic**: nucleo-operacional-mvp

---

## Problem

Depois da Feature 1, o monorepo tem infraestrutura mas nenhuma regra de
negócio. Nenhuma oficina consegue usar o produto porque não existe conta,
login, nem separação entre os dados de oficinas diferentes. Sem isolamento
multi-tenant e sem controle de acesso por papel, todas as próximas features
(Clientes, Veículos, Ordem de Serviço) não têm em cima do que construir —
IAM é a fundação que garante que cada oficina só vê e mexe nos próprios
dados, e que cada usuário só faz o que seu papel permite.

## Goal

Uma oficina se cadastra sozinha (signup self-service) e já tem um tenant e um
usuário Admin funcionando. O Admin convida colegas por e-mail definindo o
papel de cada um (Gerente, Mecânico, Recepção); cada convidado define a
própria senha e passa a logar normalmente. Toda rota autenticada sabe de qual
tenant o usuário é e qual papel ele tem, sem que nenhum módulo futuro precise
reimplementar essa lógica. Um teste de integração dedicado prova que dados de
um tenant nunca aparecem para outro.

## User Stories

- Como dono de oficina, quando eu preencho o formulário de signup (dados da
  oficina + meus dados), eu tenho uma conta Admin funcionando imediatamente,
  para eu poder começar a usar o sistema sem esperar aprovação de ninguém.
- Como Admin, quando eu convido um colega informando e-mail e papel
  (Gerente/Mecânico/Recepção), o sistema gera um link de convite para ele
  definir a própria senha, para eu poder dar acesso ao time sem eu mesmo
  escolher a senha de cada pessoa.
- Como usuário convidado, quando eu abro o link de convite e defino minha
  senha, eu consigo logar em seguida com o papel que o Admin escolheu para
  mim, para eu já começar a trabalhar no sistema.
- Como usuário logado, quando eu tento acessar uma rota ou ação que meu papel
  não permite, eu recebo um erro de permissão claro, para o sistema impedir
  ações fora da minha função sem me confundir.
- Como Admin de uma oficina, quando eu uso o sistema, eu nunca vejo clientes,
  veículos ou usuários de outra oficina, mesmo que eu tente manipular
  parâmetros da requisição, para a confidencialidade dos dados de cada
  oficina ser garantida pela plataforma, não por boa vontade do cliente da
  API.

## Requirements

### Must-have
- `POST /api/v1/auth/signup` — cria `Tenant` + `User` Admin numa única
  transação; valida CPF/CNPJ (dígito verificador) e unicidade do documento;
  valida unicidade de e-mail por tenant; senha mínima de 8 caracteres.
- `POST /api/v1/auth/login` — retorna access token JWT (~15 min) + refresh
  token (hash armazenado em `refresh_tokens`, nunca texto puro).
- `POST /api/v1/auth/refresh` — rotaciona o refresh token (o antigo é
  revogado ao ser usado).
- `POST /api/v1/auth/logout` — revoga o refresh token atual.
- `POST /api/v1/users/invite` — Admin/Gerente convida um usuário por e-mail +
  papel; cria `User` com `status = invited` e um token de convite
  (hash armazenado, com expiração); **sem envio real de e-mail nesta
  feature** — o link/token é logado e retornado na resposta (uso em dev/QA;
  a integração de envio real de e-mail é epic pós-MVP).
- `POST /api/v1/users/accept-invite` — usuário convidado define a senha
  usando o token; token expirado ou já usado é rejeitado; `status` muda para
  `active`.
- `POST /api/v1/users/list` — lista usuários do tenant (offset/limit),
  restrito a Admin/Gerente.
- `TenantContextGuard` — extrai `tenant_id` do JWT e popula contexto de
  request via `AsyncLocalStorage`.
- Prisma Middleware injeta `tenant_id` automaticamente em toda query
  (`where` e `create`) das tabelas tenant-scoped, lendo do contexto acima.
  Nenhum Repository escreve uma query sem passar pelo middleware.
- `JwtAuthGuard` protege toda rota exceto as de auth pública (`signup`,
  `login`, `refresh`, `accept-invite`).
- `RolesGuard` com decorator `@Roles(...)` usando os 4 papéis fixos
  (`ADMIN`, `MANAGER`, `MECHANIC`, `FRONT_DESK`), seed via migration/seed
  script.
- Rate limiting básico (NestJS `ThrottlerModule`) por IP em `signup`,
  `login` e `accept-invite`.
- Audit log (`audit_logs`) gravado para: signup, login, convite enviado,
  convite aceito, logout — via fila BullMQ já configurada na Feature 1
  (gravação assíncrona).
- Migrations Prisma para `tenants`, `users`, `refresh_tokens`, `roles`,
  `permissions`, `role_permissions`, `audit_logs`, seguindo convenções de
  `SCHEMA.md` (snake_case, TEXT, UUID, TIMESTAMPTZ, soft delete, sem FK
  física).
- Seed script popula os 4 papéis fixos e o mapeamento inicial de permissões.
- DTOs de request/response em `packages/contracts/` (nunca inline nos
  controllers).
- Testes de integração dedicados a isolamento multi-tenant (dois tenants,
  prova de que um nunca lê/escreve dado do outro).

### Nice-to-have
- Endpoint `GET /api/v1/users/me` retornando o usuário autenticado (dados +
  papel) — útil para o frontend, mas não bloqueia o critério de sucesso da
  feature.
- Reenvio de convite (`POST /api/v1/users/invite/resend`) gerando novo token.

### Out of scope
- Envio real de e-mail (provedor transacional) — fica para a epic de
  integrações pós-MVP; nesta feature o "envio" é log/retorno do link.
- Verificação de e-mail antes do primeiro login — não exigida no MVP.
- MFA (TOTP) — colunas `mfa_enabled`/`mfa_secret` já existem no schema, mas
  o fluxo de verificação não é implementado agora.
- RBAC granular (permissões customizáveis por tenant) — papéis são fixos e
  globais no MVP.
- Recuperação de senha ("esqueci minha senha") — não coberta por esta spec;
  considerar como follow-up rápido antes de produção, mas fora do escopo
  desta feature.
- Row-Level Security do Postgres — avaliado e descartado para o MVP (ver
  arquitetura), isolamento garantido via Prisma Middleware + testes.

## Data Model

Convenções: `snake_case`, `TEXT` (nunca `VARCHAR`), `UUID`
(`uuid_generate_v4()`), `TIMESTAMPTZ` em UTC, soft delete (`deleted_at`),
sem foreign keys físicas nem `CASCADE`.

### tenants
| Coluna | Tipo | Observação |
|---|---|---|
| id | UUID PK | |
| name | TEXT | |
| document | TEXT | CNPJ ou CPF, único (índice), validado por dígito verificador |
| plan | TEXT | default `free` — planos de verdade ficam para epic de billing |
| status | TEXT | `active` / `suspended` / `cancelled` |
| created_at / updated_at / deleted_at | TIMESTAMPTZ | |

### users
| Coluna | Tipo | Observação |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID | índice |
| email | TEXT | **único globalmente** (não por tenant) — corrigido durante o build: `POST /auth/login` só recebe `{email, password}`, sem identificador de tenant; e-mail único por tenant tornaria o login ambíguo se a mesma pessoa/e-mail existisse em duas oficinas |
| password_hash | TEXT | nullable até `accept-invite` ser concluído |
| name | TEXT | |
| role_id | UUID | FK lógica para `roles` |
| status | TEXT | `active` / `invited` / `disabled` |
| invite_token_hash | TEXT | nullable, hash do token de convite |
| invite_expires_at | TIMESTAMPTZ | nullable |
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
Papéis fixos do MVP semeados via seed: `ADMIN`, `MANAGER`, `MECHANIC`,
`FRONT_DESK`. Modelados como tabelas (não enum hardcoded) para não exigir
migration destrutiva quando o RBAC granular for implementado.

| Tabela | Colunas principais |
|---|---|
| roles | id, name, created_at — globais, sem `tenant_id` no MVP |
| permissions | id, key (ex: `os.create`), description |
| role_permissions | role_id, permission_id |

### audit_logs
| Coluna | Tipo | Observação |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID | índice |
| user_id | UUID | nullable (ex: tentativa de login falha) |
| action | TEXT | ex: `auth.signup`, `auth.login`, `user.invited`, `user.invite_accepted`, `auth.logout` |
| entity | TEXT | |
| entity_id | UUID | |
| metadata | JSONB | |
| created_at | TIMESTAMPTZ | |

## API Changes

Todas as rotas seguem RPC-style: apenas `@Get()`/`@Post()`, sempre query
params (nunca path params), listagens via `POST /resource/list` com
`{ offset, limit }`. JSON em `snake_case`, DTOs em `packages/contracts/`.

```
POST /api/v1/auth/signup
Body: { tenant_name, tenant_document, admin_name, admin_email, password }
Response 201: { access_token, refresh_token, user: {...}, tenant: {...} }

POST /api/v1/auth/login
Body: { email, password }
Response 200: { access_token, refresh_token, user: {...} }

POST /api/v1/auth/refresh
Body: { refresh_token }
Response 200: { access_token, refresh_token }

POST /api/v1/auth/logout
Body: { refresh_token }
Response 204

POST /api/v1/users/invite
Auth: ADMIN, MANAGER
Body: { email, name, role: "MECHANIC" }
Response 201: { user: {...}, invite_link }  // invite_link só para uso dev/QA nesta feature

POST /api/v1/users/accept-invite
Body: { invite_token, password }
Response 200: { access_token, refresh_token, user: {...} }

POST /api/v1/users/list
Auth: ADMIN, MANAGER
Body: { offset, limit, filters?: { status?, role? } }
Response 200: { items: [...], total, offset, limit, has_more }
```

## UI Changes

- Tela de signup (dados da oficina + admin) — formulário único, submit
  chama `POST /auth/signup` e já autentica.
- Tela de login.
- Tela "Usuários" (visível para Admin/Gerente): lista usuários do tenant +
  botão "Convidar usuário" (modal com e-mail, nome, papel).
- Tela de aceite de convite (`/invite/[token]`): define senha, chama
  `accept-invite` e redireciona autenticado.
- Guard de rota no frontend: usuário sem papel permitido para uma tela é
  redirecionado com mensagem de acesso negado (espelha `RolesGuard` do
  backend, mas a fonte de verdade continua sendo o backend).
- Estados a cobrir em cada tela: loading, erro de validação (campo a campo),
  erro genérico de servidor, sucesso.

## Edge Cases

1. **Vazamento entre tenants** — usuário do tenant A manipula
   `tenant_id`/IDs na requisição tentando ler/escrever dado do tenant B; o
   Prisma Middleware deve ignorar/rejeitar, coberto por teste de integração
   dedicado (ver Testing Criteria).
2. **Refresh token reutilizado após rotação** — um refresh token já
   rotacionado (portanto revogado) é usado novamente; deve ser rejeitado e,
   idealmente, revogar toda a família de tokens daquele usuário (sinal de
   possível token roubado).
3. **Convite expirado ou já aceito** — `accept-invite` com token expirado
   ou cujo usuário já está `active` retorna erro claro, sem alterar estado.
4. **Documento (CPF/CNPJ) ou e-mail duplicado** — signup com documento já
   cadastrado, ou convite para e-mail já existente em qualquer tenant
   (e-mail é único globalmente, não por tenant), retorna erro de validação,
   não erro genérico 500.
5. **Rate limit excedido** — múltiplas tentativas de login/signup do mesmo
   IP em curto intervalo recebem 429, sem derrubar o serviço.
6. **Usuário desabilitado ou soft-deleted tenta logar** — `status =
   disabled` ou `deleted_at` preenchido deve barrar o login com mensagem
   apropriada (não "senha inválida" genérica).
7. **Senha abaixo do mínimo** — signup/accept-invite com senha < 8
   caracteres é rejeitado na validação do DTO, antes de chegar no Manager.

## Testing Criteria

**Happy path:**
- Signup cria tenant + admin, retorna tokens válidos.
- Login retorna novo access + refresh token; refresh rotaciona; logout
  revoga.
- Admin convida um Mecânico; `accept-invite` com o token correto ativa o
  usuário e ele loga com o papel `MECHANIC`.
- `RolesGuard` permite ação para papel autorizado e bloqueia para não
  autorizado (`403`).
- `users/list` retorna apenas usuários do tenant do requisitante.

**Edge cases:**
- Teste de integração dedicado: dois tenants, dois usuários, prova de que
  requisições autenticadas no tenant A nunca retornam/afetam dados do
  tenant B (cobre `users`, e serve de modelo para as próximas features).
- Refresh token revogado/reutilizado é rejeitado.
- Convite expirado/já aceito é rejeitado sem side effects.
- Documento/e-mail duplicado retorna erro de validação (400), não 500.
- Login após N tentativas erradas em janela curta retorna 429.
- Login de usuário `disabled`/soft-deleted é bloqueado.

## Dependencies

- Feature 1 (Setup Monorepo & Infra Base) — concluída.
- Biblioteca de hashing de senha (`bcrypt` ou `argon2`).
- `@nestjs/jwt` + estratégia Passport para JWT.
- `@nestjs/throttler` para rate limiting.
- BullMQ (já configurado na Feature 1) para gravação assíncrona de
  `audit_logs`.
