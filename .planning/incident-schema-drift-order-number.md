# Nota: divergência de schema entre sessões paralelas — `order_number`

**Data**: 2026-07-27
**Quem escreveu**: sessão trabalhando em `hardening-seguranca-auth` (worktree `.worktrees/hardening-seguranca-auth`)
**Para**: sessão trabalhando no repo principal (Appointments, Perfis de Acesso, campos profissionais de OS, módulo Financeiro)

## O que aconteceu

Rodando a suíte e2e do backend a partir do worktree `hardening-seguranca-auth`
(schema baseado no commit `a35c32e`, sem as mudanças não commitadas do repo
principal), 3 suítes pré-existentes falharam ao tentar criar uma Ordem de
Serviço:

```
PrismaClientKnownRequestError:
Invalid `db.serviceOrder.create()` invocation
Null constraint violation on the fields: (`order_number`)
```

Suítes afetadas: `service-order-items.e2e-spec.ts`,
`maintenance-alerts.e2e-spec.ts`, e testes relacionados em
`service-orders.e2e-spec.ts`.

## Causa raiz

O `database/prisma/schema.prisma` do repo principal (não commitado) tem:

```prisma
orderNumber   Int       @map("order_number")
...
@@unique([tenantId, orderNumber])
```

Esse campo é **NOT NULL** e **UNIQUE por tenant** — e parece já estar
aplicado na tabela `service_orders` do Postgres **compartilhado**
(`localhost:5432`, banco `oficina_saas`), mesmo sem o `schema.prisma`
correspondente estar commitado no git.

Como meu worktree usa uma versão mais antiga do schema/Prisma Client (sem
`orderNumber`), qualquer `serviceOrder.create()` feito a partir dele não
envia esse campo — e esbarra na constraint real do banco, que já foi
aplicada por vocês.

## Isso é um bug meu?

Não. É esperado dado que dois checkouts (worktree isolado vs. repo
principal) estão apontando pro **mesmo Postgres** enquanto têm schemas
Prisma diferentes. Não mexi em nada relacionado a Ordem de Serviço nesta
sessão — meu trabalho é só hardening de auth (lockout, JWT_SECRET, helmet,
throttle no refresh). Todos os testes que eu escrevi/toquei passam
(`auth.e2e-spec.ts`, 100%).

## O que isso significa pra vocês

- O trabalho de vocês (campos profissionais de OS) parece estar
  funcionalmente aplicado no banco de dev compartilhado, mesmo sem commit.
- Se **qualquer outro worktree/checkout** (inclusive futuros) rodar
  `serviceOrder.create()` sem conhecer essa coluna, vai quebrar do mesmo
  jeito até que:
  1. O schema de vocês seja commitado (migration `10_service_order_professional_fields` formalizada), e
  2. Todo mundo rode `prisma generate` de novo depois de puxar essa mudança.
- Recomendo commitar esse trabalho (ou pelo menos a migration +
  schema.prisma) assim que estiver numa base estável, pra esse tipo de
  divergência parar de acontecer entre checkouts.

## O que eu fiz

Nada — não toquei no schema de vocês nem tentei "consertar" isso no meu
worktree (seria adivinhar um design que ainda está em andamento). Só
documentei aqui pra registro. Meu branch (`feature/hardening-seguranca-auth`)
segue isolado e não depende de nada disso.
