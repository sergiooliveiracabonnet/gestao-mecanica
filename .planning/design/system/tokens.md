# Design Tokens — Oficina SaaS

**Status:** base inicial (v1) — evolui conforme telas de negócio reais chegam a
partir da Feature 2. Inspiração: Linear, Stripe Dashboard, Notion — minimalista,
neutro, um único acento de cor.

## Colors

| Role | Token | Light | Dark | Usage |
|---|---|---|---|---|
| Primary | `--color-primary` | `#2563EB` (blue-600) | `#3B82F6` (blue-500) | Botões primários, links, estados ativos |
| Background | `--color-bg` | `#FFFFFF` | `#0B0F17` | Fundo da página |
| Surface | `--color-surface` | `#F8FAFC` | `#111827` | Cards, painéis |
| Border | `--color-border` | `#E2E8F0` | `#1F2937` | Divisores, bordas de card |
| Text primary | `--color-text` | `#0F172A` | `#F1F5F9` | Texto principal |
| Text muted | `--color-text-muted` | `#64748B` | `#94A3B8` | Texto secundário |
| Success | `--color-success` | `#16A34A` | `#22C55E` | Status ok, health check |
| Danger | `--color-danger` | `#DC2626` | `#EF4444` | Erros, ações destrutivas |
| Warning | `--color-warning` | `#D97706` | `#F59E0B` | Alertas |

Um único acento (azul) — nada de gradientes roxo/violeta nem paletas neon.
Modo escuro não é "cinza sobre cinza": fundo quase-preto (`#0B0F17`) com
contraste real no texto.

## Typography

- Fonte: **Inter** (definida deliberadamente como padrão do projeto — não é o
  default não configurado do Tailwind, é a escolha consciente para esse SaaS)
- Escala: `h1` 32px/700 → `h2` 24px/700 → `h3` 20px/600 → `body` 16px/400 →
  `caption` 13px/400
- Peso usado com intenção: títulos em 600-700, corpo em 400 — nunca tudo no
  mesmo peso

## Spacing

- Base: 4px
- Escala: `xs` 4 · `sm` 8 · `md` 16 · `lg` 24 · `xl` 32 · `2xl` 48

## Radius

- Card: 12px
- Botão: 8px
- Badge: 999px (pill)

## Shadows

- `sm`: `0 1px 2px rgba(0,0,0,0.05)`
- `md`: `0 4px 12px rgba(0,0,0,0.08)`

## Modo Claro/Escuro

Implementado via `next-themes` + CSS variables acima, seguindo preferência do
SO por padrão (`prefers-color-scheme`), com toggle manual disponível a partir
da Feature 2 (quando houver layout com header/nav).
