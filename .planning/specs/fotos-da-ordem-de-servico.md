# Evidências fotográficas da ordem de serviço

## Objetivo

Registrar evidências visuais do veículo durante todo o atendimento, organizadas
por momento e sem armazenar arquivos binários no PostgreSQL.

## Grupos

1. Entrada do veículo
2. Problemas encontrados
3. Problemas corrigidos
4. Saída do veículo

## Regras

- Upload múltiplo de JPEG, PNG e WebP.
- Máximo de 8 MiB por imagem.
- Cada foto aceita uma legenda opcional.
- Somente usuários com `service_orders.manage` adicionam ou excluem.
- Usuários com `service_orders.view` visualizam.
- Toda consulta valida tenant e vínculo com a OS.
- Exclusão lógica no banco e remoção do arquivo físico.
- Arquivos usam nomes aleatórios, nunca o nome enviado pelo usuário.

## Armazenamento

O MVP usa diretório configurável por `UPLOAD_DIR`. Em produção, esse diretório
precisa estar em volume persistente. A interface do serviço permite futura troca
por S3 sem alterar contratos ou componentes.

