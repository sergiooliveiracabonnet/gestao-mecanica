# Spec: Itens e Preço da OS

**Created**: 2026-07-27
**Status**: draft
**Author**: Sergio Oliveira
**Epic**: modulo-financeiro-relatorios (Feature 8)

---

## Problem

Hoje, quando a oficina fecha uma Ordem de Serviço, não existe nenhum registro
de quais peças foram usadas nem quanto foi cobrado por mão de obra — o valor
da OS simplesmente não existe no sistema. Isso impede qualquer coisa
financeira: cobrar o cliente com precisão, saber o faturamento, ou construir
relatórios (Feature 12, futura).

## Goal

Recepção e Gerente conseguem registrar itens de linha (peças e mão de obra)
dentro de uma OS, cada um com descrição, tipo, quantidade e valor unitário. A
OS passa a ter um valor total, calculado automaticamente a partir da soma
desses itens.

## User Stories

- Como Recepção, eu adiciono os itens usados numa OS (peças e mão de obra)
  com descrição, quantidade e valor unitário, para que o sistema calcule
  automaticamente o valor total a cobrar do cliente.
- Como Gerente, eu edito ou removo um item já lançado numa OS (ex: corrigir
  quantidade ou preço), para manter o valor da OS correto.
- Como Recepção ou Gerente, eu vejo o valor total da OS a qualquer momento,
  independente do status dela.

## Requirements

### Must-have

- Nova tabela de itens de linha vinculados a uma OS: descrição, tipo
  (`PART` | `LABOR`), quantidade, valor unitário.
- Endpoints pra criar, atualizar e remover um item de uma OS.
- Valor total da OS = soma de `quantidade × valor unitário` de todos os itens
  não removidos; exibido em `GET /service-order` e em `POST
  /service-orders/list`.
- Itens podem ser criados/editados/removidos em **qualquer status** da OS —
  decisão explícita, sem trava por status de entrega (`DELIVERED` ou
  qualquer outro).
- Acesso restrito a `ADMIN`, `MANAGER`, `FRONT_DESK` — `MECHANIC` não
  gerencia itens/preço (decisão explícita do usuário).
- Valores monetários armazenados em centavos (inteiro), nunca em ponto
  flutuante — evita erro de arredondamento.
- Quantidade aceita valores fracionários (ex: 1.5 litro de óleo), não só
  inteiros.

### Nice-to-have

- Duplicar um item já lançado (atalho pra itens repetidos).

### Out of scope

- Pagamento / forma de pagamento da OS (Feature 9, próxima desta epic).
- Despesas avulsas, contas a pagar (Feature 10, não escopada agora).
- Categorização/tipo de serviço da OS (Feature 11, não escopada agora).
- Relatórios (Feature 12, não escopada agora).
- Controle de estoque — nenhuma baixa de quantidade em estoque, nenhum
  alerta de reposição. Preço é só preço, não inventário.
- Nota fiscal, impostos, desconto percentual ou cupom.
- Lock otimista / controle de concorrência entre dois usuários editando a
  mesma OS ao mesmo tempo — último a salvar vence (ver Edge Cases).

## Data Model

Nova tabela `service_order_items`. **Sem `tenant_id`** — mesmo padrão já
usado em `ServiceOrderStatusHistory` (ver comentário no schema): a tabela só
é lida/escrita por `service_order_id`, que já passou por um
`ServiceOrderRepository.byId()` tenant-scoped antes de chegar aqui, então não
entra em `TENANT_SCOPED_MODELS`.

| Coluna | Tipo | Observação |
|---|---|---|
| id | UUID | PK |
| service_order_id | UUID | FK lógica pra `service_orders`, nunca constraint física (SCHEMA.md: sem `REFERENCES`) |
| type | TEXT | `PART` \| `LABOR` |
| description | TEXT | |
| quantity | NUMERIC(10,2) | aceita fracionário (ex: 1.5) |
| unit_price_cents | INTEGER | valor unitário em centavos |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | nullable |
| deleted_at | TIMESTAMPTZ | nullable — soft delete, mesmo padrão do resto da base |

`@@index([serviceOrderId])` — toda leitura de itens é sempre "os itens desta
OS".

Valor total da OS **não é armazenado** — calculado on-the-fly (soma de
`quantity * unit_price_cents` dos itens com `deleted_at IS NULL`) sempre que
a OS é lida (`getById`/`list`), evitando um campo denormalizado que possa
dessincronizar do que os itens realmente somam.

## API Changes

RPC-style, mesmo padrão das demais features. JSON em `snake_case`.

```
POST /api/v1/service-orders/items
Auth: ADMIN, MANAGER, FRONT_DESK
Body: { service_order_id, type: "PART"|"LABOR", description, quantity, unit_price_cents }
Response 201: { item: ServiceOrderItemResponse }

POST /api/v1/service-orders/items/update
Auth: ADMIN, MANAGER, FRONT_DESK
Body: { id, description?, quantity?, unit_price_cents?, type? }
Response 200: { item: ServiceOrderItemResponse }

POST /api/v1/service-orders/items/delete
Auth: ADMIN, MANAGER, FRONT_DESK
Body: { id }
Response 200: { item: ServiceOrderItemResponse }
```

`ServiceOrderItemResponse`: `{ id, serviceOrderId, type, description,
quantity, unitPriceCents, lineTotalCents, createdAt }` (`lineTotalCents` =
`quantity * unitPriceCents`, calculado no Response, não guardado).

`ServiceOrderResponse` (`GET /service-order`, `POST /service-orders/list`,
`POST /service-orders`) ganha dois campos novos:
- `totalAmountCents: number` — soma de todos os itens da OS.
- `items?: ServiceOrderItemResponse[]` — só populado em `getById` (mesmo
  padrão já usado por `statusHistory`: `list` não carrega a lista completa
  de itens de cada linha, só o total).

## UI Changes

- Nova seção "Itens e valores" na página de detalhe da OS
  (`frontend/app/(dashboard)/service-orders/[id]/page.tsx`): tabela de itens
  (tipo, descrição, quantidade, valor unitário, valor da linha), botão
  "Adicionar item", edição inline ou modal por item, botão remover por
  linha.
- Valor total da OS exibido em destaque nessa seção, recalculado a cada
  adição/edição/remoção (via invalidação da query, mesmo padrão já usado
  no resto do projeto).
- `ServiceOrdersTable` (lista) ganha uma coluna "Valor" com `totalAmountCents`
  formatado em R$.
- Sem UI pra editar itens em outro lugar (ex: não entra no
  `ServiceOrderFormModal` de criação — itens são adicionados depois, na
  página de detalhe).

## Edge Cases

1. **Quantidade ou valor unitário zero/negativo** — rejeitado na validação
   (`quantity > 0`, `unit_price_cents >= 0`; zero é permitido pra valor
   unitário — ex: item de cortesia — mas não pra quantidade).
2. **Remover todos os itens de uma OS** — `totalAmountCents` vira `0`, não é
   erro.
3. **Adicionar/editar/remover item numa OS que não existe ou pertence a
   outro tenant** — 404, mesmo isolamento das demais features.
4. **Dois usuários editando itens da mesma OS ao mesmo tempo** — sem lock
   otimista nesta feature; último a salvar vence (aceito explicitamente,
   ver Out of Scope).
5. **Item de outro tenant no `update`/`delete`** — 404, nunca vaza nem
   permite alterar item de outra OS/tenant (via checagem do `service_order_id`
   dono, escopado).
6. **Quantidade fracionária com muitas casas decimais** — arredondada pra 2
   casas na validação (`NUMERIC(10,2)`).
7. **OS com zero itens** — `totalAmountCents = 0`, `items: []`, nunca `null`
   ou erro.

## Testing Criteria

**Happy path:**
- Adicionar um item `PART` e um item `LABOR` numa OS; `totalAmountCents`
  reflete a soma correta.
- Editar quantidade/valor de um item já existente; total recalculado.
- Remover um item; total recalculado, item não aparece mais em `getById`.
- `POST /service-orders/list` retorna `totalAmountCents` sem carregar
  `items` completo.

**Edge cases:**
- Rejeita quantidade zero/negativa e valor unitário negativo (400).
- Item numa OS de outro tenant retorna 404 no `update`/`delete`.
- OS sem itens retorna `totalAmountCents: 0` e `items: []`.
- `MECHANIC` recebe 403 ao tentar criar/editar/remover item (só
  `ADMIN`/`MANAGER`/`FRONT_DESK`).
- Item pode ser criado/editado/removido em qualquer status da OS, incluindo
  `DELIVERED` e `CANCELLED` (sem trava).

## Dependencies

- Feature 5 (Ordem de Serviço) — concluída; `service_order_items` referencia
  `service_orders.id` (FK lógica).
- Nenhuma dependência de Feature 9/10/11/12 desta epic — esta feature é
  independente e serve de base pras demais.
