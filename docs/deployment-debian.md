# Implantação em Debian

## Objetivo

Executar o sistema em um servidor Debian com Docker Compose, HTTPS automático,
banco e Redis isolados da internet, dados persistentes, migrações idempotentes
e procedimentos claros de atualização, backup e restauração.

## Arquitetura

- Caddy publica apenas as portas 80 e 443 e emite o certificado TLS.
- Frontend e backend ficam acessíveis somente pela rede interna do Compose.
- PostgreSQL e Redis não publicam portas no host.
- Um serviço efêmero aplica migrações e o seed idempotente antes do backend.
- Volumes persistem banco, fotos das ordens e certificados.
- O frontend usa `/api` na mesma origem pública, evitando URLs `localhost`.

## Requisitos

- Debian 12 ou superior, arquitetura amd64/arm64.
- Um domínio com registro A/AAAA apontando para o servidor.
- Portas TCP 80 e 443 liberadas.
- Docker Engine com o plugin Docker Compose.
- Ao menos 2 GB de RAM e 20 GB livres para uma instalação pequena.

## Instalação

```bash
sudo apt update
sudo apt install -y ca-certificates curl git openssl
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
newgrp docker

git clone https://github.com/sergiooliveiracabonnet/gestao-mecanica.git
cd gestao-mecanica
cp deploy/debian/.env.production.example deploy/debian/.env.production
nano deploy/debian/.env.production
chmod 600 deploy/debian/.env.production
./deploy/debian/deploy.sh
```

Preencha obrigatoriamente `DOMAIN`, `POSTGRES_PASSWORD`, `JWT_SECRET` e
`SETTINGS_ENCRYPTION_KEY`. Gere segredos com:

```bash
openssl rand -base64 48
```

## Operação

Atualizar:

```bash
git pull --ff-only
./deploy/debian/deploy.sh
```

Estado e logs:

```bash
docker compose --env-file deploy/debian/.env.production \
  -f deploy/debian/compose.production.yml ps
docker compose --env-file deploy/debian/.env.production \
  -f deploy/debian/compose.production.yml logs -f --tail=200
```

Backup:

```bash
./deploy/debian/backup.sh
```

Os arquivos são gravados em `backups/` e incluem o PostgreSQL e as fotos.
Copie-os periodicamente para outro equipamento ou armazenamento externo.

Restauração do banco:

```bash
gunzip -c backups/postgres-AAAAmmdd-HHMMSS.sql.gz |
  docker compose --env-file deploy/debian/.env.production \
    -f deploy/debian/compose.production.yml exec -T postgres \
    psql -U oficina -d oficina_saas
```

## DNS e túnel

Em VPS público, aponte o domínio diretamente para o IP do Debian. Em servidor
local atrás de CGNAT, o túnel precisa encaminhar HTTP/HTTPS ao Caddy. Caso o
túnel já encerre o TLS, adapte a publicação do Caddy antes da implantação.

## Segurança mínima do host

Mantenha somente SSH, HTTP e HTTPS liberados no firewall. Antes de ativar o
firewall, confirme que a porta SSH usada pelo servidor está permitida:

```bash
sudo apt install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Não publique as portas 5432 e 6379. A stack de produção já mantém PostgreSQL e
Redis exclusivamente na rede interna do Docker.
