import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@oficina/database';
import { TenantContextService } from '../tenant-context/tenant-context.service';
import { tenantIsolationExtension } from './tenant-isolation.middleware';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  // Client SEM a extensão de isolamento — escape hatch explícito para as
  // poucas queries que precisam ser intencionalmente cross-tenant mesmo
  // dentro de uma requisição autenticada (ex: checar unicidade global de
  // e-mail no convite, lookup de token de convite/refresh token). Use com
  // cuidado: qualquer outra query em model tenant-scoped deve passar por
  // `client`, nunca por `unscoped`.
  readonly unscoped: PrismaClient = new PrismaClient();

  // A extensão só usa o componente `query` (intercepta chamadas, não
  // adiciona/remove métodos) — o shape público do client extendido é
  // idêntico ao de PrismaClient. O cast evita TS2742: o tipo inferido de
  // `$extends` referencia `@prisma/client/runtime/library` por um caminho
  // de node_modules que não é "nomeável" fora de `database/`, sob o
  // isolamento estrito de node_modules do pnpm.
  readonly client: PrismaClient;

  constructor(tenantContext: TenantContextService) {
    this.client = this.unscoped.$extends(tenantIsolationExtension(tenantContext)) as unknown as PrismaClient;
  }

  async onModuleInit(): Promise<void> {
    await this.unscoped.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.unscoped.$disconnect();
  }

  // Operações multi-tabela (ex: signup cria Tenant + User) MUST usar
  // transaction — ver TRANSACTIONS.md. Repositories aceitam um `tx`
  // opcional exatamente para serem chamados de dentro deste callback.
  //
  // CRÍTICO: abre a transação em `this.client` (extendido), não em
  // `this.unscoped`. Prisma Client Extensions só se aplicam ao `tx` se a
  // transação for aberta no client que já carrega a extensão — abrir em
  // `unscoped` produziria um `tx` sem isolamento de tenant nenhum, para
  // qualquer future feature que rode uma escrita autenticada dentro de uma
  // transação. Hoje isso é inócuo (signup roda sem tenant context, e passa
  // tenantId explícito), mas seria uma armadilha de vazamento cross-tenant
  // silenciosa assim que Clientes/Veículos/OS (Features 3-5) precisarem de
  // uma transação autenticada.
  async transaction<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return this.client.$transaction((tx) => fn(tx as unknown as PrismaClient));
  }
}
