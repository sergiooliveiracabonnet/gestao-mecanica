import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@oficina/database';
import { TenantContextService } from '../tenant-context/tenant-context.service';
import { tenantIsolationExtension } from './tenant-isolation.middleware';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly raw = new PrismaClient();

  // A extensão só usa o componente `query` (intercepta chamadas, não
  // adiciona/remove métodos) — o shape público do client extendido é
  // idêntico ao de PrismaClient. O cast evita TS2742: o tipo inferido de
  // `$extends` referencia `@prisma/client/runtime/library` por um caminho
  // de node_modules que não é "nomeável" fora de `database/`, sob o
  // isolamento estrito de node_modules do pnpm.
  readonly client: PrismaClient;

  constructor(tenantContext: TenantContextService) {
    this.client = this.raw.$extends(tenantIsolationExtension(tenantContext)) as unknown as PrismaClient;
  }

  async onModuleInit(): Promise<void> {
    await this.raw.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.raw.$disconnect();
  }
}
