import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';

const EXTENSIONS: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

@Injectable()
export class ServiceOrderPhotoStorageService {
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = resolve(config.get<string>('UPLOAD_DIR', join(process.cwd(), 'uploads')));
  }

  async save(tenantId: string, serviceOrderId: string, file: Express.Multer.File): Promise<string> {
    const extension = EXTENSIONS[file.mimetype];
    const key = join(tenantId, serviceOrderId, `${randomUUID()}${extension}`);
    const target = this.resolveKey(key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.buffer, { flag: 'wx' });
    return key.replaceAll('\\', '/');
  }

  read(key: string): Promise<Buffer> {
    return readFile(this.resolveKey(key));
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolveKey(key), { force: true });
  }

  private resolveKey(key: string): string {
    const target = resolve(this.root, key);
    if (target !== this.root && !target.startsWith(`${this.root}${sep}`)) throw new Error('Chave de armazenamento inválida.');
    return target;
  }
}
