# Plano: Redesign da Página de Detalhe da Ordem de Serviço

**Spec**: .planning/specs/redesign-pagina-ordem-servico.md
**Epic**: none
**Created**: 2026-07-27
**Status**: draft

---

## Stack

Frontend puro (Next.js/React/TypeScript). Nenhuma mudança de backend/contratos.

---

## Arquitetura

### Componentes

| Componente | Tipo | Propósito |
|---|---|---|
| `ServiceOrderStatusStepper` | Componente (novo) | Linha do tempo horizontal com as 5 etapas numeradas; trata o caso `CANCELLED` mostrando marcador vermelho na etapa onde a OS foi interrompida. |
| `ServiceOrderSummarySidebar` | Componente (novo) | Coluna fixa/sticky tipo resumo de fatura: valor total, cliente, veículo, select de técnico (auto-save), botões de transição de status. |
| `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent` | Componente (já existe, `components/ui/tabs.tsx`, radix) | Sistema de abas — Checklist / Diagnóstico / Itens e Valores / Histórico. Nenhuma mudança necessária. |
| `ServiceOrderDetailPage` | Página (modificada) | Orquestra stepper + abas + sidebar; dono do estado local de diagnóstico/checklist e do wiring de auto-save. |

Reaproveitados sem alteração interna, só de posicionamento: `InspectionChecklist`, `ServiceOrderItemsSection`, `StatusHistoryTimeline`, `StatusTransitionButtons`, `StatusBadge`, `DeleteServiceOrderDialog`.

### Localização dos arquivos

| Arquivo | Local | Propósito |
|---|---|---|
| `ServiceOrderStatusStepper.tsx` | `frontend/features/service-orders/components/` | Stepper horizontal |
| `ServiceOrderSummarySidebar.tsx` | `frontend/features/service-orders/components/` | Sidebar de resumo |
| `ServiceOrderStatusStepper.test.tsx` | `frontend/features/service-orders/components/__tests__/` | Testes do stepper |
| `ServiceOrderSummarySidebar.test.tsx` | `frontend/features/service-orders/components/__tests__/` | Testes da sidebar |

### Arquivos a alterar

| Arquivo | O que muda | Por quê |
|---|---|---|
| `frontend/app/(dashboard)/service-orders/[id]/page.tsx` | Reestruturação completa: stepper no topo, layout de duas colunas (abas à esquerda / sidebar fixa à direita), remoção do botão único "Salvar alterações", troca por auto-save por campo | Requisito must-have da spec |

Nenhum arquivo de backend, contrato ou migração é tocado — feature 100% frontend (confirmado na spec, seção Dependencies).

### Detalhe de resolução da etapa "cancelada"

`ServiceOrderResponse.statusHistory` já traz `fromStatus`/`toStatus` por transição (populado sempre que a página de detalhe busca via `getById`). Para achar em que etapa a OS foi cancelada:

```ts
const cancelledFrom = statusHistory?.find((h) => h.toStatus === 'CANCELLED')?.fromStatus ?? 'OPEN';
```

Fallback pra `'OPEN'` só é usado defensivamente (não deveria ocorrer, já que toda transição pra `CANCELLED` gera uma entrada no histórico com `fromStatus` preenchido).

### Auto-save — mecanismo por campo

| Campo | Gatilho | Debounce |
|---|---|---|
| Técnico responsável | `onValueChange` do `Select` (ação discreta) | Nenhum — dispara a mutation imediatamente |
| Diagnóstico | `onBlur` do `Textarea` | Nenhum — só dispara se o valor mudou desde o último save (evita chamada redundante ao clicar sem editar) |
| Checklist | `onChange` do `InspectionChecklist` (clique em status É imediato, mas o campo de observação é texto livre) | ~600ms debounce local (via `useRef` + `setTimeout`, limpo no unmount) pra não disparar uma request por tecla digitada na observação |
| Itens e Valores | já resolvido pela Feature 8 | — sem mudança |

Todas usam a mutation `useUpdateServiceOrder` já existente, só variando quais campos vão no payload.

---

## Fases e Tarefas

### Fase 1: Stepper de status

| # | Tarefa | Arquivos |
|---|---|---|
| 1 | Teste do `ServiceOrderStatusStepper`: 5 etapas com `OPEN` (etapa 1 atual, resto neutro); `IN_PROGRESS` (etapa 1 check, etapa 2 atual); `DELIVERED` (todas check); `CANCELLED` com `statusHistory` contendo transição `IN_PROGRESS→CANCELLED` (etapa 2 vira marcador vermelho "Cancelada", etapas 3-5 inativas); `CANCELLED` sem histórico (fallback pra etapa 1) | `features/service-orders/components/__tests__/ServiceOrderStatusStepper.test.tsx` |
| 2 | Implementar `ServiceOrderStatusStepper` pra passar os testes | `features/service-orders/components/ServiceOrderStatusStepper.tsx` |

### Fase 2: Sidebar de resumo

| # | Tarefa | Arquivos |
|---|---|---|
| 3 | Teste do `ServiceOrderSummarySidebar`: renderiza total formatado (`formatCurrencyBRL`), nome do cliente, veículo+placa, select de técnico com valor atual, dispara `onTechnicianChange` ao trocar seleção, renderiza `StatusTransitionButtons` com o status recebido | `features/service-orders/components/__tests__/ServiceOrderSummarySidebar.test.tsx` |
| 4 | Implementar `ServiceOrderSummarySidebar` (props: `serviceOrder`, `technicianId`, `onTechnicianChange`, `technicians`) pra passar os testes | `features/service-orders/components/ServiceOrderSummarySidebar.tsx` |

### Fase 3: Integração na página (depende das Fases 1 e 2)

| # | Tarefa | Arquivos |
|---|---|---|
| 5 | Reestruturar `page.tsx`: stepper no topo (abaixo do cabeçalho), grid de duas colunas — esquerda com `Tabs` (Checklist/Diagnóstico/Itens e Valores/Histórico), direita com `ServiceOrderSummarySidebar` sticky | `app/(dashboard)/service-orders/[id]/page.tsx` |
| 6 | Wiring de auto-save: técnico (`onValueChange` imediato), diagnóstico (`onBlur` com guard de "mudou desde o último save"), checklist (`onChange` com debounce ~600ms); remover `handleSave` e o botão "Salvar alterações" | `app/(dashboard)/service-orders/[id]/page.tsx` |

### Fase 4: Cobertura de edge cases e verificação manual (depende da Fase 3)

| # | Tarefa | Arquivos |
|---|---|---|
| 7 | Testes de comportamento de auto-save na página (mock de `useUpdateServiceOrder`): troca de técnico dispara mutation imediata; blur do diagnóstico só dispara se o texto mudou; edição do checklist dispara mutation após o debounce; erro de rede no save do diagnóstico mostra toast e mantém o texto no campo | `app/(dashboard)/service-orders/[id]/__tests__/page.test.tsx` (novo) |
| 8 | Verificação manual no navegador: happy path completo + os 5 edge cases da spec (cancelada, múltiplas transições simultâneas, troca de aba não perde autosave, cliente/veículo/técnico soft-deletado, OS sem itens) | — (sem arquivo, checklist manual) |

### Paralelo vs sequencial

| Grupo paralelo | Tarefas | Por quê |
|---|---|---|
| Grupo A | 1, 2, 3, 4 | Stepper e sidebar são componentes independentes, sem dependência entre si |

| Sequencial | Depende de | Por quê |
|---|---|---|
| Tarefa 5, 6 | 2, 4 | A página só pode integrar os componentes depois deles existirem |
| Tarefa 7 | 6 | Testes de auto-save da página exigem o wiring já implementado |
| Tarefa 8 | 6 | Verificação manual só faz sentido com a página já reestruturada |

---

## Plano de testes

- **Stepper**: cobre os 5 status normais + `CANCELLED` em cada uma das 3 etapas de onde é possível cancelar (`OPEN`, `IN_PROGRESS`, `WAITING_PARTS`) + fallback sem histórico.
- **Sidebar**: renderização dos dados (total/cliente/veículo/técnico) + callback de troca de técnico + presença dos botões de transição corretos por status (reaproveita a lógica já testada de `StatusTransitionButtons`, não reimplementa).
- **Página (auto-save)**: um teste por gatilho de auto-save (técnico, diagnóstico, checklist) + o caso de erro de rede no diagnóstico não limpando o campo (edge case 4 da spec).
- **Manual**: os 5 edge cases restantes da spec que dependem de interação real com o backend (transições múltiplas, troca de aba, soft-delete, OS sem itens) — cobertos no Gate 3.5 e/ou na verificação manual da Tarefa 8, não fazem sentido como teste unitário isolado.

---

## Gate 2 — Checklist

**Arquitetura:**
- [x] Segue o padrão existente do projeto (componentes em `features/service-orders/components/`, hooks reaproveitados sem mudança)
- [x] Página só orquestra — lógica de transição de status continua encapsulada em `StatusTransitionButtons`/`SERVICE_ORDER_TRANSITIONS`
- [x] Componentes novos ficam no diretório correto (`features/service-orders/components/`)

**Divisão de tarefas:**
- [x] Todos os arquivos a alterar estão listados (só `page.tsx`)
- [x] Todos os arquivos novos estão listados com localização
- [x] Cada tarefa é pequena (1-2 arquivos por tarefa)
- [x] Dependências entre tarefas estão claras (tabela sequencial acima)
- [x] Tarefas paralelas vs sequenciais estão marcadas

**Testes:**
- [x] Testes de componente planejados (stepper, sidebar)
- [x] Testes de comportamento (auto-save) planejados
- [x] Edge cases da spec cobertos (7 no total — 4 via teste automatizado, os demais via verificação manual, explicitamente listados na Fase 4)
- [x] Testes de UI planejados

Gate 2 passou.
