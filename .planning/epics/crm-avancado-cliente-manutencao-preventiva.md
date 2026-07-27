# Epic: CRM Avançado — Cadastro de Cliente Expandido e Manutenção Preventiva

**Created**: 2026-07-17
**Status**: planning
**Owner**: Sergio Oliveira

---

## Why

O MVP (epic `nucleo-operacional-mvp`) cobre o ciclo operacional básico —
Cliente → Veículo → Ordem de Serviço — mas o cadastro de cliente é raso
(só o essencial pra abrir uma OS) e a oficina não tem nenhum jeito de
saber, proativamente, quando um cliente está devendo revisão. Esta epic
enriquece o cadastro de cliente (mais dados, organizados em abas pra não
virar um formulário gigante, com histórico de atendimento visível) e
adiciona um motor que sinaliza dentro do próprio sistema quando um
veículo está a 6+ meses sem manutenção — sem prometer disparo automático
pra WhatsApp/e-mail ainda (decisão explícita: fica pra depois).

---

## Success Criteria

- [ ] O modal de edição/criação de cliente é mais largo no desktop, tem
      abas clicáveis (Dados Gerais, Contato, Preferências, Observações,
      Histórico) e nenhuma aba fica sobrecarregada
- [ ] A aba Histórico mostra todas as Ordens de Serviço já abertas pra
      aquele cliente (em qualquer veículo dele), com status e datas
- [ ] Existe uma lista/painel de alertas dentro do sistema mostrando
      todo veículo cuja última OS entregue foi há 6+ meses (ou que nunca
      teve OS entregue e o veículo já é antigo o bastante — a definir
      no spec)
- [ ] Os novos campos de cliente (documentos extras, contato secundário,
      preferências de comunicação, observações internas) são opcionais
      e não quebram nenhum fluxo existente de Clientes/Veículos/OS

---

## Features

| # | Feature | Status | Spec | Plan | Depends On |
|---|---------|--------|------|------|------------|
| 6 | Cadastro de Cliente Expandido (abas + campos + histórico) | done | [spec](../specs/cadastro-cliente-expandido.md) | [plan](../plans/cadastro-cliente-expandido.md) | #3 (Clientes), #5 (Ordem de Serviço) |
| 7 | Motor de Manutenção Preventiva (alertas internos, 6 meses) | done | [spec](../specs/motor-manutencao-preventiva.md) | [plan](../plans/motor-manutencao-preventiva.md) | #4 (Veículos), #5 (Ordem de Serviço) |

Numeração contínua a partir do epic `nucleo-operacional-mvp` (Features
1-5), já que reaproveita a base de dados e módulos daquele epic
diretamente.

---

## Feature Briefs

### Feature 6: Cadastro de Cliente Expandido
Redesenha `CustomerFormModal` pra um modal mais largo no desktop,
organizado em abas (Dados Gerais, Contato, Preferências, Observações,
Histórico). Adiciona campos opcionais: documentos extras (RG/IE),
contato secundário (nome/telefone/relação), preferências de comunicação
(canal preferido, melhor horário) e observações internas (texto livre,
visível só pra equipe). A aba Histórico lista as Ordens de Serviço do
cliente (via `GET /service-orders/list?customer_id=`, endpoint que já
existe), sem precisar de nenhum endpoint novo pra isso.

### Feature 7: Motor de Manutenção Preventiva
Job agendado (BullMQ, já no stack) que roda periodicamente e calcula,
por veículo, se a última OS com status `DELIVERED` foi entregue há 6+
meses. Gera um registro de alerta interno (nova tabela) quando o prazo
vence. Sem disparo de e-mail/WhatsApp/SMS — só uma lista/painel dentro
do próprio ERP pra recepção/gerente verem quem está devendo revisão e
decidirem como avisar o cliente manualmente.

---

## Risks

- **BullMQ scheduling**: o projeto já depende de `@nestjs/bullmq`, mas
  nenhuma feature anterior usou job agendado/repetitivo de verdade —
  primeira vez validando esse padrão em produção.
- **Veículo sem nenhuma OS `DELIVERED`**: não há data de referência pra
  calcular "6 meses desde a última manutenção" — precisa decisão no
  spec (ignorar? usar data de cadastro do veículo como fallback?).
- **Campos novos em `customers`**: contato secundário e preferências de
  comunicação têm sub-campos (nome/telefone/relação; canal/horário) —
  decisão de schema (colunas JSONB vs. tabela própria) fica pro spec da
  Feature 6, seguindo o precedente de `checklist` (JSONB) já usado em
  Ordem de Serviço.

---

## Notes

- Canal de notificação externo (e-mail/WhatsApp/SMS) fica
  explicitamente fora de escopo desta epic — decisão do usuário ao
  responder as perguntas de clarificação; alinhado com a nota já
  presente em `ordem-de-servico.md` ("Notificação ao cliente quando o
  status muda... é epic futuro").
- Ambas as features dependem só de tabelas/endpoints que já existem
  (`customers`, `vehicles`, `service_orders`) — nenhuma reestruturação
  do núcleo operacional é necessária.
