import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { SettingsController } from './controllers/settings.controller';
import { SettingsManager } from './managers/settings.manager';
import { SecretEncryptionService } from './services/secret-encryption.service';
import { TenantMailerService } from './services/tenant-mailer.service';

@Module({
  imports: [IamModule],
  controllers: [SettingsController],
  providers: [SettingsManager, SecretEncryptionService, TenantMailerService],
  exports: [TenantMailerService],
})
export class SettingsModule {}
