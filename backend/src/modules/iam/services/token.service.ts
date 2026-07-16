import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import type { UserRole } from '@oficina/contracts';

const REFRESH_TOKEN_BYTES = 48;
const DEFAULT_REFRESH_TOKEN_TTL_SECONDS = 604800; // 7 dias

export interface AccessTokenPayload {
  userId: string;
  tenantId: string;
  role: UserRole;
}

export interface OpaqueToken {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    return this.jwtService.verifyAsync<AccessTokenPayload>(token);
  }

  // Reusado por refresh tokens e por tokens de convite — ambos são
  // "algo aleatório e opaco, com expiração, cujo hash é o único valor
  // persistido no banco".
  generateOpaqueToken(ttlSeconds: number): OpaqueToken {
    const token = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    return { token, tokenHash: this.hashToken(token), expiresAt };
  }

  generateRefreshToken(): OpaqueToken {
    const ttlSeconds = this.config.get<number>('REFRESH_TOKEN_TTL_SECONDS', DEFAULT_REFRESH_TOKEN_TTL_SECONDS);
    return this.generateOpaqueToken(ttlSeconds);
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
