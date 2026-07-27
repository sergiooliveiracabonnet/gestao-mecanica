# Design System — Oficina SaaS

**Versão:** 1.0  
**Status:** direção aprovada para prototipação  
**Público:** oficinas pequenas e centros automotivos, com o proprietário como usuário principal  
**Stack de referência:** Next.js, Tailwind CSS, Radix UI e shadcn/ui

## 1. Visão

O Oficina SaaS é uma central operacional para quem precisa entender e conduzir a
oficina enquanto atende clientes, acompanha a equipe e toma decisões financeiras.
O design deve transmitir **controle, ritmo e confiança**, sem parecer um ERP legado
ou um dashboard SaaS genérico.

### Promessa da interface

> Mostrar o que exige atenção, explicar por quê e oferecer a próxima ação.

### Personalidade

- **Operacional:** conteúdo útil vem antes de decoração.
- **Direta:** frases curtas, números contextualizados e ações explícitas.
- **Confiável:** estados previsíveis, histórico visível e confirmação proporcional ao risco.
- **Humana:** linguagem de oficina, sem jargão técnico de software.
- **Robusta:** funciona em recepção, escritório, tablet e celular no chão de oficina.

### Princípios

1. **Prioridade antes de inventário:** pendências e próximos passos aparecem antes de totais.
2. **OS como eixo central:** cliente, veículo, técnico, orçamento e histórico convergem na ordem de serviço.
3. **Reconhecimento antes de memorização:** placa, modelo, nome e status são visíveis; IDs internos não são.
4. **Progressão explícita:** toda atividade longa mostra etapa atual, responsável e próxima ação.
5. **Densidade adaptável:** confortável por padrão e compacta para operações de maior volume.
6. **Cor tem significado:** laranja identifica marca/ação; estados operacionais têm semântica própria.
7. **Não depender de cor:** todo status combina texto, cor e, quando necessário, ícone.

## 2. Identidade visual

### Conceito: precisão operacional

O laranja vem da sinalização industrial e representa ação. Neutros frios criam
clareza e estabilidade. A interface não usa gradientes decorativos, glassmorphism,
neon ou grandes áreas coloridas sem função.

O acento de marca deve ocupar aproximadamente 10% a 15% da tela. É reservado a:

- ação principal;
- item de navegação ativo;
- foco do teclado;
- destaques selecionados;
- pequenos elementos de identidade.

Não usar laranja para alertas genéricos: aviso, erro, sucesso e informação têm
cores semânticas próprias.

### Logotipo temporário

Até existir uma identidade definitiva, usar o símbolo de chave combinado ao nome
“Oficina”. Evitar engrenagens, carros esportivos e brasões automotivos genéricos.
O símbolo nunca substitui o nome em contextos onde a marca ainda não é conhecida.

## 3. Arquitetura de tokens

Todos os valores seguem três camadas:

```text
Primitivo (valor) → Semântico (função) → Componente (aplicação)
```

Componentes não devem consumir cores primitivas diretamente. Valores hardcoded
são permitidos apenas na declaração dos tokens primitivos.

### 3.1 Cores primitivas

#### Laranja industrial

| Token | Valor | Uso de referência |
|---|---:|---|
| `orange-50` | `#FFF7ED` | seleção e fundo sutil |
| `orange-100` | `#FFEDD5` | destaque suave |
| `orange-200` | `#FED7AA` | borda de destaque |
| `orange-300` | `#FDBA74` | elementos no tema escuro |
| `orange-400` | `#FB923C` | ação principal no tema escuro |
| `orange-500` | `#F97316` | gráfico e indicador |
| `orange-600` | `#EA580C` | hover claro |
| `orange-700` | `#C2410C` | ação principal no tema claro |
| `orange-800` | `#9A3412` | active e texto de destaque |
| `orange-900` | `#7C2D12` | contraste forte |
| `orange-950` | `#431407` | superfícies escuras temáticas |

#### Neutros frios

| Token | Valor |
|---|---:|
| `slate-0` | `#FFFFFF` |
| `slate-50` | `#F8FAFC` |
| `slate-100` | `#F1F5F9` |
| `slate-200` | `#E2E8F0` |
| `slate-300` | `#CBD5E1` |
| `slate-400` | `#94A3B8` |
| `slate-500` | `#64748B` |
| `slate-600` | `#475569` |
| `slate-700` | `#334155` |
| `slate-800` | `#1E293B` |
| `slate-900` | `#0F172A` |
| `slate-950` | `#0B0F17` |

#### Estados

| Família | Sutil | Base | Forte | Significado |
|---|---:|---:|---:|---|
| Verde | `#F0FDF4` | `#16A34A` | `#166534` | sucesso, concluído, saudável |
| Âmbar | `#FFFBEB` | `#D97706` | `#92400E` | atenção, prazo, dependência |
| Vermelho | `#FEF2F2` | `#DC2626` | `#991B1B` | erro, bloqueio, destrutivo |
| Azul | `#EFF6FF` | `#2563EB` | `#1E40AF` | informação e estado em andamento |

### 3.2 Cores semânticas

| Token semântico | Claro | Escuro | Função |
|---|---|---|---|
| `background` | `slate-0` | `slate-950` | fundo da aplicação |
| `surface` | `slate-50` | `#111827` | barra lateral e áreas agrupadas |
| `card` | `slate-0` | `#111827` | conteúdo elevado |
| `popover` | `slate-0` | `#131A26` | menus, selects e tooltips |
| `foreground` | `slate-900` | `slate-100` | texto principal |
| `foreground-muted` | `slate-500` | `slate-400` | texto secundário |
| `foreground-subtle` | `slate-400` | `slate-500` | metadados não essenciais |
| `border` | `slate-200` | `#1F2937` | borda padrão |
| `border-strong` | `slate-300` | `slate-700` | divisores importantes |
| `primary` | `orange-700` | `orange-400` | ação e identidade |
| `primary-hover` | `orange-800` | `orange-300` | hover |
| `primary-active` | `orange-900` | `orange-200` | active |
| `primary-foreground` | `slate-0` | `orange-950` | texto sobre primary |
| `focus` | `orange-700` | `orange-400` | foco visível |
| `selection` | `orange-50` | `#2A1A0F` | item selecionado |

#### Estados semânticos operacionais

| Estado | Aparência | Exemplos |
|---|---|---|
| `neutral` | cinza + texto | rascunho, não iniciado |
| `info` | azul + ícone informativo | em diagnóstico, em serviço |
| `attention` | âmbar + ícone de relógio/alerta | aguardando aprovação, vencendo hoje |
| `critical` | vermelho + ícone de alerta | atrasado, pagamento recusado, bloqueado |
| `success` | verde + ícone de confirmação | aprovado, pronto, entregue |

### 3.3 Tipografia

**Família:** Plus Jakarta Sans. Ela já está instalada e dá identidade suficiente
sem comprometer legibilidade. Usar tabular numbers em métricas, moeda, quilometragem
e tempo.

| Estilo | Tamanho/linha | Peso | Uso |
|---|---:|---:|---|
| `display` | 32/40 | 700 | número ou mensagem principal do dashboard |
| `heading-1` | 28/36 | 700 | título de página |
| `heading-2` | 22/30 | 700 | seção principal |
| `heading-3` | 18/26 | 600 | card e subseção |
| `body-lg` | 16/24 | 400 | conteúdo destacado |
| `body` | 14/22 | 400 | padrão da aplicação |
| `label` | 14/20 | 600 | campos e controles |
| `caption` | 12/18 | 500 | metadados e apoio |
| `overline` | 11/16 | 700, +0.06em | agrupadores curtos em caixa alta |

Regras:

- títulos de página em sentence case;
- não usar texto menor que 12px;
- limitar parágrafos a aproximadamente 72 caracteres;
- nunca usar peso 300;
- números financeiros usam alinhamento à direita e `font-variant-numeric: tabular-nums`.

### 3.4 Espaçamento e layout

Base de 4px:

`0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80`

| Semântico | Mobile | Tablet | Desktop |
|---|---:|---:|---:|
| margem da página | 16 | 24 | 32 |
| intervalo entre seções | 24 | 32 | 32 |
| padding de card | 16 | 20 | 24 |
| intervalo de formulário | 16 | 20 | 20 |
| largura máxima de conteúdo | — | — | 1440 |

O dashboard não deve ficar preso ao `max-width: 1024px` atual. Telas operacionais
usam a largura disponível até 1440px; formulários e textos mantêm colunas menores.

### 3.5 Grid responsivo

| Faixa | Colunas | Margem | Navegação |
|---|---:|---:|---|
| 320–599 | 4 | 16 | barra inferior ou drawer |
| 600–1023 | 8 | 24 | sidebar recolhida |
| 1024–1439 | 12 | 24 | sidebar 240px |
| 1440+ | 12 | 32 | sidebar 256px, conteúdo limitado |

Não definir experiência apenas por breakpoint. Componentes de dados devem usar
container queries quando sua composição depender do espaço do próprio componente.

### 3.6 Forma, borda e elevação

| Token | Valor | Uso |
|---|---:|---|
| `radius-sm` | 4px | chips pequenos e detalhes |
| `radius-md` | 8px | botões, inputs e menus |
| `radius-lg` | 12px | cards e painéis |
| `radius-xl` | 16px | dialogs e sheets |
| `radius-full` | 999px | avatar e badges |
| `shadow-sm` | `0 1px 2px rgb(15 23 42 / .06)` | cards padrão |
| `shadow-md` | `0 8px 24px rgb(15 23 42 / .10)` | popovers |
| `shadow-lg` | `0 20px 48px rgb(15 23 42 / .16)` | dialogs |

Cards usam borda e sombra mínima. Não transformar toda seção em card: divisores,
espaçamento e fundos de seção são preferíveis quando não há necessidade de elevação.

### 3.7 Movimento

| Tipo | Duração | Curva |
|---|---:|---|
| cor/foco | 120ms | ease-out |
| controles e menus | 160ms | ease-out |
| drawers e dialogs | 220ms | cubic-bezier(.2,.8,.2,1) |
| reorganização de quadro | 240ms | cubic-bezier(.2,.8,.2,1) |

- animação nunca bloqueia ação;
- respeitar `prefers-reduced-motion`;
- não animar métricas na entrada;
- skeletons não devem pulsar agressivamente.

### 3.8 Iconografia

Usar Lucide, já presente no projeto:

- 16px em controles compactos;
- 18px em navegação e botões padrão;
- 20px em ações de toque;
- traço padrão de 1.75px;
- ícone decorativo usa `aria-hidden="true"`;
- botão somente com ícone exige nome acessível e tooltip no desktop.

## 4. Densidade

O sistema oferece duas densidades, sem criar componentes paralelos:

| Elemento | Confortável | Compacta |
|---|---:|---:|
| botão/input | 40px | 36px |
| linha de tabela | 52px | 44px |
| item de menu | 44px | 36px |
| padding de card | 24px | 16px |

“Confortável” é padrão para pequenas oficinas. “Compacta” pode ser preferência do
usuário em centros automotivos, mas alvos de toque continuam com pelo menos 44px
quando o dispositivo indicar entrada por toque.

## 5. Componentes fundamentais

Cada componente deve implementar: default, hover, focus-visible, active, disabled,
loading e error quando aplicável.

### 5.1 Botão

Variantes:

- **primary:** uma ação principal por região;
- **secondary:** alternativa importante;
- **outline:** ação terciária;
- **ghost:** ação contextual;
- **destructive:** somente para consequência destrutiva;
- **link:** navegação dentro de texto.

Tamanhos: 36, 40 e 48px. No mobile, ações primárias de formulário têm 48px.
Loading mantém a largura, apresenta spinner e usa `aria-busy`.

### 5.2 Campos

Anatomia obrigatória: label, controle, ajuda opcional e erro reservado no fluxo.
Placeholder não substitui label. Máscaras de CPF, CNPJ, telefone, placa e moeda não
alteram o valor inesperadamente durante a digitação.

Campos previstos:

- texto, busca, textarea e senha;
- moeda, porcentagem, quilometragem e quantidade;
- data, hora e prazo;
- select, combobox assíncrono e multi-select;
- checkbox, radio, switch e segment control;
- upload de foto/documento.

### 5.3 Status badge

Badge comunica estado curto e estável. Deve ter texto; ícone é usado em condições
que demandam atenção. Não tornar badge clicável — usar botão/chip de filtro quando
houver interação.

Mapeamento inicial de OS:

| Status de negócio | Semântica | Rótulo recomendado |
|---|---|---|
| `OPEN` | neutral | Entrada |
| `DIAGNOSIS` | info | Em diagnóstico |
| `AWAITING_APPROVAL` | attention | Aguardando aprovação |
| `APPROVED` | info | Aprovada |
| `IN_PROGRESS` | info | Em serviço |
| `READY` | success | Pronta para entrega |
| `DELIVERED` | success | Entregue |
| `CANCELLED` | neutral | Cancelada |

“Atrasada” é uma condição transversal e deve aparecer junto ao status, não substituir
o estágio da OS.

### 5.4 Card

Variantes: padrão, interativo, métrica e alerta. Cards interativos precisam ter um
único destino principal. Evitar card dentro de card.

Card de métrica sempre responde:

1. o que está sendo medido;
2. qual é o valor;
3. qual período;
4. se exige ação.

### 5.5 Tabela e lista responsiva

Tabelas são adequadas para comparação no desktop. No mobile, a mesma informação vira
lista estruturada; não usar rolagem horizontal como única solução.

- primeira coluna identifica o objeto;
- números à direita;
- status com largura previsível;
- ações em menu, mantendo a ação mais frequente visível;
- cabeçalho fixo em listas longas;
- paginação explica intervalo: “1–20 de 84”;
- seleção em lote só aparece quando necessária.

### 5.6 Dialog, sheet e página

- confirmação simples: dialog até 420px;
- formulário curto: dialog até 640px;
- formulário longo ou fluxo em etapas: página ou sheet amplo;
- mobile: dialog complexo vira sheet de tela cheia;
- exclusão informa objeto e consequência;
- foco é capturado, restaurado e o Escape fecha quando seguro.

### 5.7 Feedback

- **toast:** confirmação efêmera, nunca informação que precisa ser consultada;
- **alert inline:** erro contextual ou bloqueio recuperável;
- **banner:** condição global da oficina/conta;
- **empty state:** explica valor e oferece uma ação real;
- **skeleton:** replica a geometria do conteúdo;
- **error state:** descreve o que falhou e como tentar novamente.

## 6. Componentes operacionais do domínio

### 6.1 Placa do veículo

Componente de identificação que combina placa em destaque, marca/modelo e ano.
Não imitar visualmente uma placa oficial. Deve aceitar busca, seleção e modo somente
leitura.

### 6.2 Card de ordem de serviço

Anatomia:

- placa + veículo;
- cliente;
- status e condição de prazo;
- técnico responsável;
- valor/aprovação quando relevante;
- próxima ação;
- tempo no estágio.

O card muda a informação secundária conforme a coluna do quadro. Em “Aguardando
aprovação”, valor e tempo de espera têm precedência; em “Em serviço”, técnico e
previsão têm precedência.

### 6.3 Pipeline de OS

Kanban no desktop, lista agrupada no mobile. Arrastar é um atalho, nunca a única forma
de mudar status. Transições inválidas são bloqueadas com explicação. Mudanças críticas
pedem os dados necessários antes de avançar.

### 6.4 Timeline

Combina eventos de status, comentários, aprovação, alterações financeiras e entrega.
Agrupa eventos automáticos de baixa importância e destaca autor, data e consequência.

### 6.5 Checklist de inspeção

Substitui o JSON livre por grupos configuráveis:

- item: ok, atenção, crítico ou não verificado;
- observação e evidência fotográfica opcionais;
- resumo de pendências;
- operação rápida por toque;
- histórico de quem alterou e quando.

### 6.6 Indicador de capacidade

Mostra técnicos disponíveis, em atendimento e sobrecarregados. Evitar reduzir pessoas
a um percentual isolado; exibir carga, quantidade de OS e previsão.

### 6.7 Bloco financeiro

Valor orçado, aprovado, adicional e recebido usam formatação brasileira e números
tabulares. Diferenças precisam indicar origem. Vermelho não representa valor negativo
quando ele não é necessariamente um erro.

## 7. Navegação e composição

### Desktop

- sidebar de 240–256px;
- “Visão da oficina” como primeira rota;
- grupos: Operação, Relacionamento e Gestão;
- topbar com busca global, ações rápidas, alertas e conta;
- título e descrição pertencem ao conteúdo da página, não a uma barra fixa genérica.

### Mobile

- barra inferior para Visão, OS, Agenda e Mais;
- botão contextual para nova OS;
- busca global disponível no topo;
- ações críticas não ficam escondidas apenas em swipe;
- áreas fixas respeitam safe areas.

## 8. Padrões de conteúdo

### Vocabulário

| Preferir | Evitar |
|---|---|
| Nova OS | Criar registro |
| Aguardando aprovação do cliente | Pendente |
| Veículo pronto para entrega | Processo finalizado |
| Não foi possível salvar | Erro 500 |
| Tentar novamente | Recarregar recurso |
| Excluir cliente | Confirmar ação |

### Datas, números e unidades

- moeda: `R$ 1.250,00`;
- data: `26 jul. 2026`, com ano quando necessário;
- hora: `14:30`;
- relativo apenas como apoio: `há 2 h · 14:30`;
- quilometragem: `82.450 km`;
- telefone e documentos formatados na exibição;
- prazo sempre explicita fuso e data em ações críticas.

### Confirmações

- não confirmar ações facilmente reversíveis;
- confirmar exclusão, cancelamento e mudança financeira relevante;
- botão destrutivo repete o verbo e objeto: “Excluir cliente”;
- sucesso não deve interromper o fluxo com modal.

## 9. Acessibilidade

Meta: WCAG 2.2 AA, mantendo compatibilidade mínima com WCAG 2.1 AA.

- contraste de texto comum ≥ 4,5:1;
- texto grande e componentes visuais ≥ 3:1;
- foco visível com 2px e offset de 2px;
- ordem de tabulação acompanha a ordem visual;
- alvo de toque recomendado de 44×44px;
- headings seguem hierarquia sem saltos;
- mudanças assíncronas relevantes usam região viva;
- erros são associados ao campo via `aria-describedby`;
- status não dependem exclusivamente de cor;
- atalhos de teclado são documentados e configuráveis;
- zoom de 200% não perde conteúdo ou funcionalidade;
- movimento reduzido desliga transições espaciais não essenciais.

Validação mínima por release: teclado, NVDA no Windows, axe, contraste e viewports
de 375, 768 e 1440px.

## 10. Temas

Claro é o tema padrão recomendado para recepção e escritório. Escuro é suportado para
preferência pessoal e ambientes de baixa luminosidade. Os dois têm a mesma hierarquia;
dark mode não é uma inversão automática.

Gráficos, status, bordas e skeletons precisam de tokens próprios por tema. Fotos de
veículos e documentos não devem receber filtros de cor.

## 11. Governança

### Fonte de verdade

1. este documento define intenção e regras;
2. tokens versionados definem valores;
3. componentes da biblioteca definem comportamento;
4. telas consomem componentes sem redefinir sua identidade.

### Critério para criar componente

Criar um componente compartilhado quando houver repetição real, comportamento complexo,
regra de acessibilidade ou conceito de domínio estável. Duas caixas visualmente parecidas
não são, sozinhas, motivo para abstração.

### Definition of Done de UI

- usa apenas tokens semânticos/componentes;
- contempla loading, vazio, erro, sucesso e permissão;
- funciona em 375, 768 e 1440px;
- opera com teclado;
- possui nomes acessíveis;
- passa contraste AA;
- usa conteúdo realista em português;
- não introduz variante sem documentação;
- tem teste de comportamento para lógica relevante.

## 12. Migração do produto atual

### Divergências encontradas

- documentação antiga indica azul e Inter; o produto usa laranja e Plus Jakarta Sans;
- tokens atuais estão em uma única camada;
- `max-w-5xl` limita telas operacionais;
- componentes têm alturas e raios parcialmente inconsistentes;
- “Checklist JSON livre” não segue o modelo mental do usuário;
- metadata e textos apresentam problemas de codificação em alguns arquivos;
- a navegação não possui dashboard ou adaptação mobile.

### Ordem recomendada

1. consolidar tokens primitivos, semânticos e de componente;
2. alinhar Tailwind e aliases shadcn;
3. normalizar Button, Input, Select, Card, Badge, Table e Dialog;
4. criar Alert, EmptyState, Skeleton, Tooltip, Sheet e Combobox;
5. criar StatusBadge e padrões de OS;
6. refazer shell responsivo e navegação;
7. aplicar ao dashboard e fluxo de ordens de serviço;
8. migrar clientes, veículos, alertas e usuários;
9. remover aliases legados após validação visual e testes.

## 13. Próximos artefatos

- catálogo visual dos tokens em claro e escuro;
- playground dos componentes fundamentais;
- especificação do shell responsivo;
- protótipo da Visão da Oficina;
- protótipo do quadro e detalhe da OS;
- checklist automatizado de uso de tokens e acessibilidade.

