# Epic: Módulo Financeiro + Relatórios Gerenciais

**Created**: 2026-07-27
**Status**: planning
**Owner**: Sergio Oliveira

---

## Why

A oficina hoje não tem nenhuma visibilidade financeira nem de indicadores
operacionais: não dá pra saber quanto entrou de dinheiro, quantas manutenções
foram feitas num período, ou qual tipo de serviço é mais comum. Esta epic
constrói a base de dados financeira (preço por OS, formas de pagamento,
despesas) e um campo de categorização de OS, pra então alimentar um menu de
Relatórios Gerenciais com esses indicadores. É o módulo "financeiro" que o
epic `nucleo-operacional-mvp` já citava como futuro.

---

## Success Criteria

- [ ] Ao fechar uma OS, é possível registrar peças + mão de obra com preços e
      a forma de pagamento usada
- [ ] É possível registrar despesas avulsas da oficina (fora de OS) e ver
      contas a receber/pagar em aberto
- [ ] O menu de Relatórios mostra fluxo de caixa (entradas por período),
      quantidade de manutenções executadas por período, e categoria de
      serviço mais atendida — tudo com dado real do sistema, nada mockado

---

## Features

| # | Feature | Status | Spec | Plan | Depends On |
|---|---------|--------|------|------|------------|
| 8 | Itens e Preço da OS | done | [spec](../specs/itens-e-preco-da-os.md) | [plan](../plans/itens-e-preco-da-os.md) | #5 (Ordem de Serviço) |
| 9 | Pagamentos da OS | todo | — | — | #8 |
| 10 | Despesas e Contas a Pagar | todo | — | — | — |
| 11 | Categorização de OS | todo | — | — | #5 (Ordem de Serviço) |
| 12 | Menu de Relatórios | todo | — | — | #8, #9, #11 |

Numeração contínua a partir dos epics `nucleo-operacional-mvp` (Features 1-5)
e `crm-avancado-cliente-manutencao-preventiva` (Features 6-7).

**Escopo desta rodada**: apenas as Features 8 e 9 serão especificadas/
planejadas/construídas agora. Features 10-12 ficam registradas aqui como
próximos passos, não fazem parte do trabalho imediato.

---

## Feature Briefs

### Feature 8: Itens e Preço da OS
Peças e mão de obra como itens de linha dentro da Ordem de Serviço, cada um
com descrição, quantidade e valor unitário; a OS passa a ter um valor total
calculado a partir desses itens. Itens podem ser editados em qualquer status
da OS — decisão explícita, sem trava por status de entrega. Sem controle de
estoque (baixa de peças não é rastreada, só o preço).

### Feature 9: Pagamentos da OS
Registro de forma de pagamento (dinheiro, cartão, PIX, etc.) e status de
pagamento (pago/parcial/pendente) por OS. "Contas a receber" nesta epic é
modelado como OS com pagamento parcial ou pendente — não é uma entidade
separada.

### Feature 10: Despesas e Contas a Pagar
Lançamentos financeiros avulsos da oficina, fora de qualquer OS (aluguel,
fornecedor, salário, etc.). Não escopada nesta rodada.

### Feature 11: Categorização de OS
Campo "tipo de serviço" na Ordem de Serviço (ex: revisão, elétrica, troca de
óleo), usado depois pelo relatório de categoria mais atendida. Não escopada
nesta rodada.

### Feature 12: Menu de Relatórios
Painel com fluxo de caixa (a partir de Features 8/9), quantidade de
manutenções executadas por período, e categoria mais atendida (a partir da
Feature 11). Não escopada nesta rodada — depende das anteriores existirem.

---

## Risks

- **Sem controle de estoque**: preços de peças são só valor, não há baixa de
  quantidade em estoque nem alerta de reposição — fora de escopo desta epic
  por completo (seria um epic de Estoque separado, se necessário no futuro).
- **Edição sem trava de status**: decisão explícita de não bloquear edição de
  itens/preço por status da OS nesta rodada; se isso causar inconsistência
  em relatórios financeiros futuros (ex: valor mudando depois de já contado
  num fluxo de caixa fechado), pode precisar de revisão quando a Feature 12
  for construída.

---

## Notes

- Features 10, 11 e 12 ficam com spec/plan pendentes — retomar quando a
  prioridade for revisitada.
- "Contas a receber" e "contas a pagar" não são um módulo de parcelamento/
  boleto nesta epic — só status pago/parcial/pendente por OS (Feature 9) e
  lançamentos avulsos de despesa (Feature 10, não escopada agora).
