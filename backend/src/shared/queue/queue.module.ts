import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const AUDIT_LOG_QUEUE = 'audit-log';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = new URL(config.getOrThrow<string>('REDIS_URL'));
        return {
          connection: {
            host: redisUrl.hostname,
            port: Number(redisUrl.port || 6379),
          },
        };
      },
    }),
    BullModule.registerQueue({ name: AUDIT_LOG_QUEUE }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
