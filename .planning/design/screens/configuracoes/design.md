# Design — Configurações

Direção visual: painel administrativo utilitário e sóbrio, alinhado ao design
system existente. A navegação local fica em uma coluna compacta; o formulário
ocupa a área principal, com agrupamentos semânticos e resumo visual da marca.

## Estrutura

- Cabeçalho: `Configurações` e texto de contexto.
- Navegação local: Empresa e marca, E-mail, Equipe e acesso.
- Empresa: prévia da marca, identificação, contato, endereço e documentos.
- E-mail: estado da conexão, remetente e credenciais SMTP.
- Equipe: reaproveita a gestão atual sem duplicar regras.

## Comportamento

- Formulários têm largura estável; conteúdo condicional não redimensiona a
  estrutura.
- Upload mostra prévia, substituição e remoção.
- Senha SMTP nunca aparece; placeholder comunica quando já existe.
- Mobile usa abas horizontais; desktop usa navegação lateral.

