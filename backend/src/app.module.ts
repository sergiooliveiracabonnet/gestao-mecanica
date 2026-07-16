import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './shared/prisma/prisma.module';
import { TenantContextModule } from './shared/tenant-context/tenant-context.module';
import { JwtConfigModule } from './shared/jwt/jwt-config.module';
import { JwtAuthGuard } from './shared/guards/jwt-auth.guard';
import { RolesGuard } from './shared/guards/roles.guard';
import { TenantContextInterceptor } from './shared/interceptors/tenant-context.interceptor';
import { QueueModule } from './shared/queue/queue.module';
import { AuditLogModule } from './shared/audit-log/audit-log.module';
import { IamModule } from './modules/iam/iam.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL', 60000),
            limit: config.get<number>('THROTTLE_LIMIT', 100),
          },
        ],
      }),
    }),
    PrismaModule,
    TenantContextModule,
    JwtConfigModule,
    QueueModule,
    AuditLogModule,
    HealthModule,
    IamModule,
  ],
  providers: [
    // Ordem importa: ThrottlerGuard e JwtAuthGuard rodam antes do RolesGuard
    // (que depende de request.user já populado pelo JwtAuthGuard).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // Interceptors rodam depois dos guards no pipeline do Nest — por isso o
    // TenantContextInterceptor (que lê request.user) é seguro aqui.
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
})
export class AppModule {}
