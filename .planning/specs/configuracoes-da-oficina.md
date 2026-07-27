# Configurações da oficina

## Objetivo

Centralizar a administração do tenant, permitindo personalizar a identidade da
oficina, configurar o remetente de e-mail e administrar equipe e acessos.

## Escopo

- Menu pai `Configurações`, com filhos `Empresa e marca`, `E-mail` e
  `Equipe e acesso`.
- Dados da empresa: nome fantasia, razão social, CPF/CNPJ, inscrição estadual,
  telefone, WhatsApp, e-mail, site e endereço completo.
- Identidade: logo e texto complementar para o rodapé dos documentos.
- Logo aplicada no topo do sidebar e à esquerda dos cabeçalhos de relatórios.
- SMTP por tenant: servidor, porta, TLS, usuário, senha, remetente e e-mail de
  resposta, com teste de envio.
- A senha SMTP é somente escrita: a API informa apenas se está configurada.
- Configurações protegidas pelas permissões `settings.view` e
  `settings.manage`.

## Regras

- Logo aceita PNG, JPEG ou WebP e no máximo 500 KiB.
- A senha existente é preservada quando o campo é deixado vazio.
- Alterações são isoladas por tenant e auditáveis.
- Usuários sem permissão não visualizam nem alteram configurações.
- Falha de SMTP deve produzir mensagem acionável sem revelar credenciais.

## Fora do escopo inicial

- Hospedagem da logo em storage externo.
- Editor livre de templates HTML.
- Domínio próprio e validação DNS de SPF/DKIM.

