# Spec: Cadastro de Cliente Expandido

**Created**: 2026-07-17
**Status**: draft
**Author**: Sergio Oliveira
**Epic**: crm-avancado-cliente-manutencao-preventiva

---

## Problem

O cadastro de cliente (Feature 3) só guarda o essencial pra abrir uma OS:
nome, documento, telefone, e-mail, endereço e um campo único de notas.
Isso já não é suficiente pro dia a dia da recepção — não tem onde
registrar um contato alternativo (cônjuge, sócio, motorista da empresa),
não tem como saber o canal/horário preferido do cliente pra retorno de
ligação, e não existe nenhum jeito de ver o histórico de atendimento
daquele cliente sem sair da tela e ir procurar na lista de Ordens de
Serviço filtrando manualmente. Conforme a lista de campos cresce, o
modal atual (`max-w-lg`, ~512px, tudo empilhado verticalmente) fica
comprido demais pra ser usável.

## Goal

O modal de cliente fica mais largo no desktop e organizado em abas
clicáveis, cada uma com um grupo coeso de informação. A recepção
consegue, na mesma tela: ver/editar os dados cadastrais, registrar um
contato secundário, definir preferência de comunicação, manter
observações internas, e consultar o histórico completo de Ordens de
Serviço daquele cliente — sem sair do modal.

## User Stories

- Como Recepção, quando um cliente frequente liga e prefere ser
  contatado por WhatsApp de tarde, eu registro essa preferência no
  cadastro dele, pra da próxima vez a gente já saber como e quando
  entrar em contato.
- Como Recepção, quando o dono da empresa não atende e o motorista da
  frota é quem sempre traz os carros, eu registro esse contato
  secundário no cadastro do cliente PJ, pra ligar direto pro motorista
  quando precisar.
- Como Gerente, quando preciso saber quantas vezes um cliente já trouxe
  carro na oficina, eu abro o cadastro dele e vejo a aba Histórico com
  todas as Ordens de Serviço, sem precisar ir pra tela de Ordens de
  Serviço e filtrar manualmente.
- Como Admin, quando um cliente é problemático (histórico de
  inadimplência, reclamação recorrente), eu registro isso nas
  observações internas, visíveis só pra equipe, nunca expostas em nada
  voltado ao cliente.

## Requirements

### Must-have
- Modal de cliente (`CustomerFormModal`) reorganizado em 5 abas
  clicáveis: **Dados Gerais**, **Contato**, **Preferências**,
  **Observações**, **Histórico**.
- Modal significativamente mais largo em telas desktop (≥768px) do que
  o `max-w-lg` atual; em mobile mantém o comportamento responsivo já
  existente (largura quase total da tela).
- Aba **Dados Gerais**: campos já existentes (tipo, documento, nome,
  telefone, e-mail, endereço) + 2 campos novos opcionais — `rg` (visível
  quando `type = PF`) e `stateRegistration`/Inscrição Estadual (visível
  quando `type = PJ`). Nenhuma validação cruzada impede preencher o
  campo "errado" pro tipo — é só um guia de UI, não uma trava.
- Aba **Contato**: 3 campos novos opcionais — `secondaryContactName`,
  `secondaryContactPhone`, `secondaryContactRelation` (ex: "Cônjuge",
  "Motorista", "Sócio") — texto livre, sem enum fechado pro campo de
  relação.
- Aba **Preferências**: 2 campos novos opcionais — canal de contato
  preferido (`preferredContactChannel`: `PHONE` | `WHATSAPP` | `EMAIL` |
  `SMS`) e melhor horário (`preferredContactTime`: `MORNING` |
  `AFTERNOON` | `EVENING` | `ANY`) — ambos como `Select`, não texto
  livre.
- Aba **Observações**: campo `notes` já existente, promovido de `Input`
  pra `Textarea` (componente já disponível desde a Feature 5) — mesma
  informação, mais espaço pra escrever.
- Aba **Histórico**: lista as Ordens de Serviço do cliente (todos os
  veículos dele), reaproveitando `ServiceOrdersTable`/hook existentes,
  chamando `POST /service-orders/list` com o novo filtro `customer_id`
  (ver API Changes). Só aparece em modo edição — cliente novo (ainda sem
  `id`) não tem aba Histórico habilitada (mostra estado vazio explicando
  "disponível depois de salvar o cliente").
- `POST /api/v1/service-orders/list` ganha filtro opcional
  `customer_id` — pequena extensão da Feature 5, necessária pra aba
  Histórico funcionar sem N chamadas por veículo.
- Todos os 7 campos novos de cliente são opcionais; nenhum fluxo
  existente de criar/editar/listar cliente quebra por causa deles.
- Trocar de aba não perde dados preenchidos em outra aba — é o mesmo
  formulário (`react-hook-form`), só a aba visível muda.

### Nice-to-have
- Contador de OS abertas/total na própria aba Histórico (ex: "12 OS no
  total, 2 abertas") — não bloqueia a entrega, fica pra polish se sobrar
  tempo.
- Máscara de telefone no campo de contato secundário — mesmo padrão que
  já poderia existir (ou não) no telefone principal; não é regressão
  desta feature se não existir.

### Out of scope
- Upload de documento/foto do RG ou contrato social — fora de escopo,
  mesma decisão já tomada pra fotos de veículo na Feature 4 (só URL,
  sem upload real, e aqui nem isso).
- Envio de mensagem pro cliente a partir da preferência de comunicação
  registrada (WhatsApp/e-mail automático) — isso é exatamente o motor
  da Feature 7 (Manutenção Preventiva) e mesmo esse é só alerta interno,
  não disparo externo. Aqui é só o campo de preferência, sem nenhuma
  integração de envio.
- Validação de formato de RG/Inscrição Estadual (dígito verificador,
  etc.) — ao contrário de CPF/CNPJ (que já tem validação real), estes
  são campos de texto livre sem validação de formato nesta feature.
- Edição de qual OS aparece na aba Histórico — é só leitura; qualquer
  ação (editar status, etc.) continua acontecendo na tela de detalhe da
  própria OS (`/service-orders/[id]`), a aba Histórico só linka pra lá.

## Data Model

Extensão da tabela `customers` (Feature 3) — 7 colunas novas, todas
nullable, sem migração de dados existentes necessária:

| Coluna | Tipo | Observação |
|---|---|---|
| rg | TEXT | nullable; visível na UI só quando `type = PF` |
| state_registration | TEXT | nullable; visível na UI só quando `type = PJ` |
| secondary_contact_name | TEXT | nullable |
| secondary_contact_phone | TEXT | nullable |
| secondary_contact_relation | TEXT | nullable |
| preferred_contact_channel | TEXT | nullable; enum de app: `PHONE`, `WHATSAPP`, `EMAIL`, `SMS` |
| preferred_contact_time | TEXT | nullable; enum de app: `MORNING`, `AFTERNOON`, `EVENING`, `ANY` |

Colunas típadas simples em vez de JSONB — mesmo padrão já usado pros
campos opcionais de `vehicles` (`engine`, `fuelType`, `chassis`,
`mileage`): estrutura conhecida e estável, sem necessidade da
flexibilidade de um JSON livre (ao contrário do `checklist` de Ordem de
Serviço, que é deliberadamente livre).

`notes` não muda de tipo no banco (continua `TEXT`) — só a UI que
promove de `Input` pra `Textarea`.

## API Changes

RPC-style, mesmo padrão das Features 3-5. JSON em `snake_case`.

```
POST /api/v1/customers
Auth: ADMIN, MANAGER, FRONT_DESK
Body: { type, document, name, phone, email?, address?, notes?,
        rg?, state_registration?, secondary_contact_name?,
        secondary_contact_phone?, secondary_contact_relation?,
        preferred_contact_channel?, preferred_contact_time? }
Response 201: { customer: {...} }

POST /api/v1/customers/update
Auth: ADMIN, MANAGER, FRONT_DESK
Body: { id, name?, phone?, email?, address?, notes?,
        rg?, state_registration?, secondary_contact_name?,
        secondary_contact_phone?, secondary_contact_relation?,
        preferred_contact_channel?, preferred_contact_time? }
Response 200: { customer: {...} }
  // customer response inclui os 7 campos novos

POST /api/v1/service-orders/list
Auth: ADMIN, MANAGER, FRONT_DESK, MECHANIC
Body: { offset, limit, status?, vehicle_id?, technician_id?, customer_id? }
  // customer_id é o único campo novo — extensão da Feature 5
Response 200: { items: [...], total, offset, limit, has_more }
```

## UI Changes

- `CustomerFormModal.tsx`: `DialogContent` ganha `sm:max-w-2xl
  lg:max-w-3xl` (ou equivalente) em vez do `max-w-lg` padrão herdado do
  primitivo shadcn; mobile mantém o comportamento atual.
- Novo primitivo shadcn `Tabs` (`components/ui/tabs.tsx`, baseado em
  Radix Tabs) — ainda não existe no projeto, precisa ser adicionado
  (mesmo padrão de quando `Textarea` foi adicionado na Feature 5).
- 5 abas: **Dados Gerais** (campos existentes + rg/IE condicionais por
  tipo), **Contato** (3 campos novos), **Preferências** (2 selects
  novos), **Observações** (notes como Textarea), **Histórico** (tabela
  read-only de OS, reaproveitando componentes da Feature 5).
- Aba Histórico: estado vazio ("Nenhuma ordem de serviço ainda")
  quando o cliente não tem OS; estado desabilitado com texto explicativo
  quando o modal está em modo criação (cliente ainda não existe).
- Estados a cobrir em cada aba: loading (histórico busca dados
  assíncronos, as outras 4 não), erro de validação campo a campo
  (mesmo padrão de toast + `form.setError` já usado), vazio (aba
  Histórico sem OS).

## Edge Cases

1. **Modal em modo criação (cliente novo)** — aba Histórico aparece
   desabilitada ou com estado explicativo, nunca tenta chamar
   `service-orders/list` sem um `customer_id` válido.
2. **Contato secundário parcialmente preenchido** — usuário preenche só
   `secondaryContactName` sem telefone, por exemplo; aceito sem
   validação cruzada (tudo opcional, tudo independente).
3. **Campo de documento "errado" pro tipo** — cliente PF com
   `stateRegistration` preenchido, ou PJ com `rg` preenchido; aceito sem
   bloqueio, é só uma inconsistência de dado, não um erro de validação.
4. **Cliente com histórico extenso** (dezenas de OS) — a aba Histórico
   pagina como a tela de Ordens de Serviço já pagina (`offset`/`limit`),
   não tenta carregar tudo de uma vez.
5. **Trocar de aba com validação pendente** — se o usuário preencheu
   e-mail inválido na aba Dados Gerais e troca pra aba Preferências sem
   corrigir, o erro de validação continua visível quando ele volta pra
   Dados Gerais (estado do formulário é único, compartilhado entre
   abas).
6. **`customer_id` de outro tenant no filtro de `service-orders/list`**
   — mesmo padrão de isolamento já coberto pelos filtros existentes
   (`vehicle_id`, `technician_id`): retorna lista vazia, nunca vaza
   dado de outro tenant.

## Testing Criteria

**Happy path:**
- Criar cliente preenchendo campos de todas as 4 abas editáveis
  (Dados Gerais, Contato, Preferências, Observações) persiste todos os
  7 campos novos corretamente.
- Editar cliente existente atualizando só a aba Preferências não afeta
  os valores das outras abas.
- Abrir aba Histórico de um cliente com OS mostra a lista correta,
  igual à tela de Ordens de Serviço filtrada manualmente por aquele
  cliente.
- Abrir aba Histórico de um cliente sem OS mostra o estado vazio.
- Modal renderiza mais largo em viewport desktop (≥768px) e mantém
  comportamento responsivo em mobile.

**Edge cases:**
- Aba Histórico desabilitada/com aviso em modo criação.
- Campos opcionais parcialmente preenchidos (contato secundário,
  preferências) são aceitos e persistidos como enviados.
- `rg`/`state_registration` preenchidos fora do tipo esperado não são
  bloqueados.
- Paginação da aba Histórico funciona pra cliente com muitas OS.
- Filtro `customer_id` em `service-orders/list` isolado por tenant
  (teste e2e, mesmo padrão dos filtros existentes).

## Dependencies

- Feature 3 (Clientes) — concluída; esta feature estende `customers`.
- Feature 5 (Ordem de Serviço) — concluída; esta feature estende
  `service-orders/list` com o filtro `customer_id` e reaproveita
  `ServiceOrdersTable`/hooks pra aba Histórico.
- Nenhuma dependência da Feature 7 (Manutenção Preventiva) — os campos
  de preferência de comunicação só ficam guardados aqui; o motor da
  Feature 7 não lê nem usa esses campos (é alerta interno, sem envio).
