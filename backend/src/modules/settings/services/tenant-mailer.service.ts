import { BadRequestException, Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { TenantRepository } from '../../iam/repositories/tenant.repository';
import { SecretEncryptionService } from './secret-encryption.service';

@Injectable()
export class TenantMailerService {
  constructor(
    private readonly tenants: TenantRepository,
    private readonly secrets: SecretEncryptionService,
  ) {}

  async send(tenantId: string, input: { to: string; subject: string; text?: string; html?: string }) {
    const tenant = await this.tenants.byId(tenantId);
    if (!tenant?.smtpEnabled || !tenant.smtpHost || !tenant.smtpFromEmail) {
      throw new BadRequestException('Configure e ative o envio de e-mail antes de continuar.');
    }
    const transporter = nodemailer.createTransport({
      host: tenant.smtpHost,
      port: tenant.smtpPort,
      secure: tenant.smtpSecure,
      auth: tenant.smtpUsername && tenant.smtpPassword
        ? { user: tenant.smtpUsername, pass: this.secrets.decrypt(tenant.smtpPassword) }
        : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    return transporter.sendMail({
      from: { name: tenant.smtpFromName || tenant.name, address: tenant.smtpFromEmail },
      replyTo: tenant.smtpReplyTo || undefined,
      ...input,
    });
  }
}
