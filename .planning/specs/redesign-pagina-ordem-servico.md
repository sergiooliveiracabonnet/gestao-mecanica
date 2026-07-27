# Spec: Redesign da Página de Detalhe da Ordem de Serviço

**Created**: 2026-07-27
**Status**: draft
**Author**: Sergio Oliveira
**Epic**: none (feature standalone de UI sobre a Feature 5 — Ordem de Serviço, já concluída)

---

## Problem

A página de detalhe da OS (`/service-orders/[id]`) hoje é uma pilha vertical de
cartões do mesmo peso visual — checklist, diagnóstico, itens e histórico, um
embaixo do outro, tudo em scroll único. Não existe nenhum indicador visual
rápido de "em que pé está esse carro", o técnico responsável fica perdido
numa seção isolada, e salvar qualquer mudança depende de lembrar de clicar
em "Salvar alterações". O resultado é uma tela que "parece amadora" — sem
hierarquia, sem organização, sem a sensação de sistema profissional que a
oficina precisa pra impressionar cliente e ser eficiente no dia a dia.

## Goal

A equipe abre uma OS e em menos de 2 segundos sabe: em que etapa o carro
está, quanto vai custar, quem é o responsável, e onde encontrar
checklist/diagnóstico/itens/histórico sem depender de scroll longo. Toda
edição salva sozinha, sem botão de salvar pra lembrar de clicar.

## User Stories

- Como Recepção, ao abrir uma OS, eu vejo de cara em que etapa o veículo
  está (linha do tempo no topo) e o valor total, sem precisar rolar a
  página, pra responder rápido se o cliente ligar perguntando.
- Como Mecânico, eu edito o diagnóstico ou marco um item do checklist e a
  informação já fica salva, sem precisar lembrar de clicar em nenhum botão.
- Como Gerente, eu vejo todas as ações de transição de status válidas pra
  etapa atual reunidas num só lugar (coluna de resumo), sem precisar achar
  os botões em outra parte da tela.
- Como qualquer papel, ao ver uma OS cancelada, eu entendo imediatamente em
  que etapa ela foi interrompida, sem confundir com uma etapa concluída.

## Requirements

### Must-have

- **Linha do tempo horizontal** no topo da página: stepper numerado com as
  5 etapas do fluxo normal — Entrada (`OPEN`), Em andamento
  (`IN_PROGRESS`), Aguardando peças (`WAITING_PARTS`), Pronto
  (`COMPLETED`), Entregue (`DELIVERED`). Etapas concluídas com check,
  etapa atual destacada, etapas futuras neutras.
- **OS cancelada (`CANCELLED`)**: a etapa em que a OS estava quando foi
  cancelada vira um marcador vermelho "Cancelada" no lugar de continuar a
  sequência numérica; as etapas posteriores àquela ficam inativas/cinza.
  O stepper reflete sempre o **status atual** da OS, nunca a trajetória
  histórica (ex: se voltou de `WAITING_PARTS` pra `IN_PROGRESS`, mostra a
  etapa 2 como atual normalmente, sem indicar "retrocesso").
- **Corpo em duas colunas** abaixo da linha do tempo:
  - Esquerda (área principal): abas — **Checklist** (inspeção visual já
    existente), **Diagnóstico** (textarea já existente), **Itens e
    Valores** (`ServiceOrderItemsSection`, Feature 8), **Histórico**
    (`StatusHistoryTimeline` já existente).
  - Direita (coluna fixa/sticky, tipo resumo de fatura): valor total em
    destaque (`totalAmountCents` formatado), nome do cliente, veículo +
    placa, técnico responsável (select), e os botões de todas as
    transições válidas a partir do status atual (usa
    `SERVICE_ORDER_TRANSITIONS[status]` já existente — sem lógica nova,
    só reposicionamento de `StatusTransitionButtons`).
- **Técnico responsável** sai da seção própria atual e passa a viver
  dentro da coluna de resumo fixa.
- **Sem botão único "Salvar alterações"** — cada seção salva sozinha:
  - Técnico: salva imediatamente ao trocar a seleção no select (mesma
    mutation `useUpdateServiceOrder`, só com `technicianId`).
  - Diagnóstico: salva ao perder o foco do campo (`onBlur`), não precisa
    de botão nem de debounce por tecla digitada.
  - Checklist: salva a cada item alterado (mesma mutation, só com
    `checklist` serializado a partir do estado atual dos itens).
  - Itens e Valores: já salva por ação (adicionar/editar/remover) desde a
    Feature 8 — sem mudança aqui.
- Excluir a OS continua acessível (mesmo botão/posição do cabeçalho).

### Nice-to-have

- Feedback visual sutil (ex: "Salvo" piscando por 1s) depois de um
  auto-save bem-sucedido, pra dar confiança de que salvou.

### Out of scope

- Qualquer funcionalidade nova: impressão/PDF da OS, anexar fotos,
  previsão/data de entrega, assinatura do cliente. Esta feature é só
  reorganização visual/estrutural do que já existe — decisão explícita do
  usuário.
- Mudar a máquina de estados (`SERVICE_ORDER_TRANSITIONS`) — continua
  exatamente igual, só muda onde os botões de transição aparecem na tela.
- Mudar o quadro Kanban da lista de OS ou o fluxo de criação de nova OS —
  só a página de detalhe está no escopo desta rodada.

## UI Changes

- `frontend/app/(dashboard)/service-orders/[id]/page.tsx`: reestruturado
  por completo — linha do tempo horizontal no topo, layout de duas colunas
  (abas + resumo fixo) abaixo, técnico movido pra dentro do resumo,
  remoção do botão "Salvar alterações" único.
- Novo componente `ServiceOrderStatusStepper.tsx`: recebe `status` atual,
  renderiza as 5 etapas numeradas + tratamento do estado `CANCELLED`
  (etapa onde parou vira marcador vermelho).
- Novo componente `ServiceOrderSummarySidebar.tsx`: agrega valor total,
  cliente, veículo, seletor de técnico (com auto-save), e
  `StatusTransitionButtons` (componente já existente, só relocado).
- `InspectionChecklist`, `ServiceOrderItemsSection`,
  `StatusHistoryTimeline`: componentes já existentes, passam a viver
  dentro de um sistema de abas em vez de empilhados — sem mudança na
  lógica interna deles, só em como são exibidos (aba ativa/inativa).
- Diagnóstico: mesmo `Textarea` já existente, ganha `onBlur` disparando
  auto-save em vez de depender do botão global.
- Sem lib de tabs nova necessariamente — usar o mesmo padrão de
  componentes já usados no design system atual (`Select`, `Button`, etc.);
  se não existir um componente de abas pronto no design system, criar um
  simples e reutilizável (não é o foco desta spec, decisão de
  implementação no plano).

## Edge Cases

1. **OS cancelada** — a etapa onde parou vira marcador vermelho
   "Cancelada"; etapas posteriores ficam inativas (Must-have, já
   detalhado acima).
2. **Etapa com múltiplas transições válidas** (ex: `IN_PROGRESS` →
   `WAITING_PARTS` | `COMPLETED` | `CANCELLED`) — todos os botões
   aparecem juntos na coluna de resumo, igual ao comportamento atual de
   `StatusTransitionButtons`, só reposicionado.
3. **Transição "pra trás"** (`WAITING_PARTS` → `IN_PROGRESS`) — o stepper
   sempre reflete o status atual da OS após a transição, nunca tenta
   mostrar histórico/trajetória; sem estado visual especial pra isso.
4. **Perda de foco durante o auto-save do diagnóstico com erro de rede**
   — se a mutation falhar, mostra toast de erro (mesmo padrão já usado no
   projeto) e o texto digitado permanece no campo (não reverte), pra não
   perder o que foi escrito; usuário pode tentar de novo saindo do campo
   outra vez.
5. **Cliente, veículo ou técnico removidos (soft-deleted) depois da OS
   criada** — mesmo fallback null-safe já existente hoje ("Cliente
   removido", "—", etc.) continua valendo na coluna de resumo nova.
6. **OS sem nenhum item lançado** — resumo mostra "R$ 0,00" (já correto
   desde a Feature 8, sem mudança de comportamento).
7. **Trocar de aba com o diagnóstico ainda não salvo (campo em foco)** —
   trocar de aba tira o foco do textarea, o que já dispara o `onBlur` e
   salva antes da troca visual acontecer.

## Testing Criteria

**Happy path:**
- Abrir uma OS em `OPEN` mostra a etapa 1 destacada no stepper, as
  demais neutras.
- Avançar a OS para `IN_PROGRESS` via botão na sidebar atualiza o
  stepper para a etapa 2 destacada, etapa 1 com check.
- Trocar o técnico no select da sidebar dispara a mutation de update sem
  precisar de nenhum botão adicional.
- Editar o diagnóstico e clicar fora do campo (blur) dispara a mutation
  de update com o novo texto.
- Marcar um item do checklist dispara a mutation de update com o
  checklist serializado atualizado.

**Edge cases:**
- OS cancelada a partir de `IN_PROGRESS` mostra a etapa 2 como marcador
  vermelho "Cancelada", etapas 3-5 inativas.
- OS em `IN_PROGRESS` mostra os 3 botões de transição válidos
  simultaneamente na sidebar (`WAITING_PARTS`, `COMPLETED`, `CANCELLED`).
- Falha de rede ao salvar o diagnóstico mostra toast de erro e não
  limpa o texto do campo.
- OS com cliente/veículo/técnico soft-deletados renderiza os fallbacks
  corretos na sidebar, sem quebrar a página.
- Trocar de aba (Checklist → Diagnóstico) não perde nem duplica o
  auto-save do campo que estava em foco na aba anterior.

## Dependencies

- Feature 5 (Ordem de Serviço) — concluída; reaproveita
  `SERVICE_ORDER_TRANSITIONS`, `StatusTransitionButtons`,
  `StatusHistoryTimeline`, `InspectionChecklist`, `useUpdateServiceOrder`.
- Feature 8 (Itens e Preço da OS) — concluída;
  `ServiceOrderItemsSection` é reaproveitado como está, só relocado pra
  dentro do sistema de abas.
- Nenhuma mudança de backend/contratos necessária — feature 100%
  frontend.
