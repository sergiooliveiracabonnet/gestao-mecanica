# Screen: Página de Verificação (Feature 1)

**Feature:** setup-monorepo-infra-base
**Tokens:** `.planning/design/system/tokens.md`

## Propósito

Única tela desta feature. Não é uma tela de produto — é a prova visual de que
o frontend consegue chamar o backend (`GET /health`) usando os tokens base já
definidos. Vira o esqueleto que o layout real (header, nav, sidebar) substitui
a partir da Feature 2.

## Layout

Card único, centralizado vertical e horizontalmente, `max-width: 420px`.

```
┌──────────────────────────────────┐
│                                   │
│      Oficina SaaS                │  ← h2, --color-text
│      Ambiente de desenvolvimento │  ← caption, --color-text-muted
│                                   │
│   ┌───────────────────────────┐  │
│   │ ● Backend conectado        │  │  ← badge pill, --color-success
│   │   GET /health → 200 ok     │  │     quando a chamada tem sucesso
│   └───────────────────────────┘  │
│                                   │
└──────────────────────────────────┘
```

## Estados

| Estado | O que mostra |
|---|---|
| Carregando | Badge cinza "Verificando conexão..." com spinner pequeno |
| Sucesso | Badge verde (`--color-success`) "Backend conectado" + timestamp do `/health` |
| Erro | Badge vermelho (`--color-danger`) "Backend indisponível" + mensagem de erro amigável, sem stack trace |

## Responsivo

- Mobile (375px): card ocupa `calc(100% - 32px)`, mesma estrutura
- Desktop (1440px): card fixo em 420px, centralizado

## Acessibilidade

- Badge de status usa ícone + texto (não só cor) para diferenciar
  sucesso/erro/carregando
- Contraste do texto sobre `--color-surface` validado ≥ 4.5:1 em ambos os temas

## Fora do escopo desta tela

Header, navegação, logo definitivo, qualquer elemento de produto — chegam com
a Feature 2 quando existir tela de login/dashboard real.
