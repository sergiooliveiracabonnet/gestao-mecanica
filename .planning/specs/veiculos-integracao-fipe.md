# Spec: Integração FIPE (Marca/Modelo por Seleção)

**Created**: 2026-07-17
**Status**: draft
**Author**: Sergio Oliveira
**Epic**: none

---

## Problem

Hoje, cadastrar um veículo (Feature 4) exige digitar marca e modelo à mão
em dois campos de texto livre. Isso é lento, sujeito a erro de digitação
("Fiat" vs "fiat" vs "FIAT") e gera dado inconsistente pra buscar/filtrar
depois. A oficina precisa de uma base confiável de marcas e modelos pra
selecionar em vez de digitar, sem depender de uma chamada externa toda
vez que alguém abre o formulário (lento e vulnerável a limite de taxa da
API pública).

## Goal

Ao abrir o formulário de veículo, a recepção escolhe a categoria (Carro/
Moto/Caminhão), depois a marca e o modelo em selects dependentes,
populados a partir de uma cópia local da Tabela FIPE já sincronizada no
banco — sem chamada externa na hora do cadastro. Quando marca ou modelo
não está na base (importado raro, adaptação), a opção "Outro" libera o
campo de texto livre como hoje, sem nunca bloquear o cadastro.

## User Stories

- Como Recepção, quando cadastro um veículo comum (ex: Fiat Uno), eu
  seleciono "Carro" → "Fiat" → "Uno" em vez de digitar, pra não errar o
  nome da marca/modelo e ser mais rápido.
- Como Recepção, quando o veículo é um caminhão ou moto, eu troco a
  categoria pra ver a lista certa de marcas daquele tipo.
- Como Recepção, quando o veículo é um importado raro que não está na
  FIPE, eu seleciono "Outro" e digito marca/modelo manualmente, sem
  travar o cadastro.
- Como Admin, quando a base da FIPE está desatualizada, eu disparo uma
  ressincronização manual sem precisar mexer no banco direto.

## Requirements

### Must-have
- Sincronização da base FIPE (marcas + modelos) pras 3 categorias
  (Carro, Moto, Caminhão) pra tabelas locais — nenhuma chamada à API
  pública da FIPE acontece durante o cadastro de um veículo, só durante
  a sincronização em background.
- Job agendado (semanal) que resincroniza a base automaticamente,
  usando BullMQ (já no stack, mas primeira vez com job *repetível* —
  até aqui só jobs disparados sob demanda, ver `audit-log.processor.ts`).
- Sincronização automática na primeira subida do sistema, se as tabelas
  estiverem vazias (evita depender de alguém disparar manualmente após
  o deploy inicial).
- `POST /api/v1/fipe/sync` — dispara ressincronização manual sob
  demanda, só ADMIN, roda em background (não bloqueia a resposta HTTP).
- `GET /api/v1/fipe/brands?category=` — lista marcas locais de uma
  categoria (CAR, MOTORCYCLE ou TRUCK).
- `GET /api/v1/fipe/models?brand_id=` — lista modelos locais de uma
  marca.
- `VehicleFormModal`: campos "Marca"/"Modelo" (hoje `Input` livre)
  viram `Select` dependentes de uma nova "Categoria" (Carro/Moto/
  Caminhão, padrão "Carro"), com opção "Outro" no fim de cada lista que
  libera o `Input` de texto livre — mesmo comportamento de hoje quando
  selecionada.
- `brand`/`model` continuam sendo os mesmos campos de texto livre no
  contrato de `CreateVehicleRequest`/`UpdateVehicleRequest` — o select
  só preenche esses campos com o nome escolhido; **nenhuma mudança no
  contrato ou na tabela `vehicles` já existente**. Categoria é um
  detalhe transitório da UI (usado só pra filtrar a lista de marcas),
  não é persistido no veículo.
- Base FIPE não é escopada por tenant — é dado de referência global
  (mesmo catálogo pra toda oficina); **não** entra em
  `TENANT_SCOPED_MODELS`, mesma lógica de exclusão já documentada pra
  `ServiceOrderStatusHistory`, mas por um motivo diferente (aqui não é
  "tabela filha sem tenant_id", é "não é dado de tenant nenhum").

### Nice-to-have
- Indicador de "última sincronização" visível pra Admin (data/hora).
- Busca por texto dentro do select de marca (hoje é `Select` nativo com
  type-to-jump do Radix, sem busca de verdade) — mesma limitação
  pragmática já aceita nos seletores de cliente/veículo/técnico das
  Features 4/5.

### Out of scope
- Ano do veículo por FIPE (a tabela FIPE tem ano-modelo com preço por
  ano) — o campo `year` do veículo continua número livre como hoje, sem
  cascata de um terceiro nível. Simplificação deliberada: a oficina
  precisa saber a marca/modelo certos pra achar peça, o ano exato da
  tabela FIPE não muda isso.
- Preço FIPE do veículo — a API retorna valor de mercado, mas isso não
  tem uso nesta feature (não é módulo de avaliação/orçamento).
- Remoção de marcas/modelos que saíram da FIPE — a sincronização faz
  upsert (insere novo, atualiza existente), nunca remove; se uma marca
  sumir da FIPE, ela continua na base local (inofensivo, e evita
  quebrar veículos já cadastrados referenciando aquele nome).
- Combobox com autocomplete/busca — ficou definido usar `Select` +
  opção "Outro" (mesmo padrão dos seletores existentes), não um
  componente novo de combobox com busca livre.

## Data Model

Duas tabelas novas, **sem `tenant_id`** (dado de referência global, não
de tenant) e **sem soft delete** (sincronização por upsert, não CRUD de
usuário — ver Out of Scope sobre remoção).

### fipe_brands
| Coluna | Tipo | Observação |
|---|---|---|
| id | UUID PK | |
| category | TEXT | `CAR`, `MOTORCYCLE` ou `TRUCK` |
| fipe_code | TEXT | código da marca na API da FIPE |
| name | TEXT | |
| synced_at | TIMESTAMPTZ | quando essa linha foi atualizada pela última sincronização |
| created_at / updated_at | TIMESTAMPTZ | |

Índice único composto `(category, fipe_code)` — chave de upsert.

### fipe_models
| Coluna | Tipo | Observação |
|---|---|---|
| id | UUID PK | |
| brand_id | UUID | índice; FK lógica pra `fipe_brands`, validada na camada de aplicação |
| fipe_code | TEXT | código do modelo na API da FIPE |
| name | TEXT | |
| synced_at | TIMESTAMPTZ | |
| created_at / updated_at | TIMESTAMPTZ | |

Índice único composto `(brand_id, fipe_code)` — chave de upsert.

## API Changes

RPC-style, JSON em `snake_case`, mesmo padrão das features anteriores.
Todos os 4 papéis podem ler (`GET`); só ADMIN dispara sincronização.

```
GET /api/v1/fipe/brands?category=CAR
Auth: ADMIN, MANAGER, FRONT_DESK, MECHANIC
Response 200: { brands: [{ id, name }] }

GET /api/v1/fipe/models?brand_id=<uuid>
Auth: ADMIN, MANAGER, FRONT_DESK, MECHANIC
Response 200: { models: [{ id, name }] }

POST /api/v1/fipe/sync
Auth: ADMIN
Response 202: { message: "Sincronização iniciada." }
  // enfileira o job e retorna na hora — não espera a sincronização terminar
```

## UI Changes

- `VehicleFormModal.tsx`: nova `Select` "Categoria" (Carro/Moto/
  Caminhão, padrão "Carro") acima dos campos existentes.
- Campo "Marca": vira `Select` populado por `GET /fipe/brands?category=`
  da categoria escolhida; última opção da lista é "Outro (digitar
  manualmente)" — ao selecionar, troca pra `Input` de texto livre
  (mesmo campo `brand` do formulário).
- Campo "Modelo": mesma lógica, populado por `GET /fipe/models?brand_id=`
  da marca escolhida; desabilitado até uma marca ser selecionada; tem
  a mesma opção "Outro".
- Trocar a Categoria depois de já ter escolhido Marca/Modelo limpa a
  seleção de Marca/Modelo (lista antiga não faz mais sentido pra
  categoria nova).
- Editar um veículo existente: marca/modelo já cadastrados aparecem
  como texto livre pré-preenchido (igual hoje); a recepção só usa os
  selects se quiser *trocar* marca/modelo através da FIPE — não há
  como "adivinhar" a categoria original de um veículo já cadastrado,
  então a Categoria sempre reabre em "Carro" por padrão na edição.
- Estados a cobrir: loading da lista de marcas/modelos, lista vazia
  (categoria sem sincronização ainda — mostra só a opção "Outro"),
  erro genérico de carregamento (mesmo com erro, "Outro" continua
  disponível — nunca trava o cadastro).

## Edge Cases

1. **Base FIPE vazia na primeira subida** — sincronização automática de
   bootstrap dispara; até ela terminar, os selects de marca mostram
   "Carregando..." e, se vazios, caem pra só a opção "Outro" (nunca
   trava o formulário esperando a sincronização).
2. **API pública da FIPE fora do ar durante a sincronização** — o job
   falha aquela tentativa, loga o erro, e tenta de novo no próximo
   agendamento; a base local (se já tiver dado de uma sincronização
   anterior) continua servindo normalmente — sincronização é sempre
   incremental/substitutiva, nunca apaga a base antes de confirmar que
   a API respondeu.
3. **Rate limit da API pública da FIPE atingido no meio da
   sincronização** — mesmo tratamento do item anterior: aquele
   ciclo falha parcialmente (algumas marcas sincronizadas, outras não),
   loga, tenta de novo no próximo agendamento; não há retry agressivo
   dentro do mesmo ciclo que piore o rate limit.
4. **Marca escolhida via FIPE, depois usuário troca a Categoria** —
   Marca e Modelo resetam pra vazio (evita salvar uma combinação
   marca/categoria inconsistente visualmente, mesmo `brand`/`model`
   sendo só texto no final).
5. **`brand_id` de `GET /fipe/models` que não existe** — retorna lista
   vazia (200), não erro — evita expor se um id existe ou não
   (mesmo princípio de não vazar existência já usado noutros filtros).
6. **`POST /fipe/sync` disparado por um papel que não é ADMIN** —
   403, mesma resposta padrão de autorização já usada em todo o app.
7. **Dois disparos de sincronização simultâneos** (job agendado e
   manual coincidindo) — a sincronização é idempotente (upsert por
   `(category, fipe_code)`/`(brand_id, fipe_code)`), então rodar duas
   vezes ao mesmo tempo não corrompe dado, só desperdiça requisições
   à API pública; não é um problema que precise de lock explícito
   nesta primeira versão.

## Testing Criteria

**Happy path:**
- Sincronização popula `fipe_brands`/`fipe_models` corretamente pras 3
  categorias a partir de dados simulados da API da FIPE (client
  mockado nos testes, nunca bate na API real).
- `GET /fipe/brands?category=CAR` retorna só marcas daquela categoria.
- `GET /fipe/models?brand_id=` retorna só modelos daquela marca.
- Selecionar Categoria → Marca → Modelo no formulário de veículo
  preenche `brand`/`model` corretamente e o veículo é criado com esses
  valores (mesmo payload de antes, sem campo novo).
- "Outro" em Marca ou Modelo libera o `Input` de texto livre e o
  veículo é criado normalmente com o texto digitado.

**Edge cases:**
- Sincronização com a API externa falhando no meio não apaga dado já
  sincronizado antes.
- `POST /fipe/sync` sem ser ADMIN retorna 403.
- Trocar Categoria depois de escolher Marca/Modelo reseta os dois.
- `brand_id` inexistente em `GET /fipe/models` retorna lista vazia, não
  erro.
- Categoria sem nenhuma marca sincronizada ainda mostra só "Outro" no
  select de Marca, sem quebrar o formulário.

## Dependencies

- Feature 4 (Veículos) — concluída; esta feature não muda `vehicles`
  nem seu contrato, só adiciona uma fonte de sugestão pros campos
  `brand`/`model` já existentes.
- BullMQ (`QueueModule`, já configurado) — reaproveitado; primeira vez
  com um job *agendado/repetível* neste projeto (até aqui só
  `audit-log`, que é disparado sob demanda, nunca em cron).
- API pública da FIPE (`fipe.parallelum.com.br/api/v2`) — sem
  autenticação, limite de 1000 requisições por ~9h observado
  empiricamente; uma sincronização completa das 3 categorias usa
  ~300-400 requisições (1 por marca, pra listar os modelos dela), bem
  dentro do limite.
