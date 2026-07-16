import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';

describe('TokenService', () => {
  let service: TokenService;

  beforeEach(() => {
    const jwtService = new JwtService({ secret: 'test-secret', signOptions: { expiresIn: 900 } });
    const configService = new ConfigService();
    service = new TokenService(jwtService, configService);
  });

  it('signs and verifies an access token round-trip', async () => {
    const payload = { userId: 'u1', tenantId: 't1', role: 'ADMIN' as const };
    const token = await service.signAccessToken(payload);
    const decoded = await service.verifyAccessToken(token);
    expect(decoded).toMatchObject(payload);
  });

  it('rejects an invalid access token', async () => {
    await expect(service.verifyAccessToken('not-a-real-token')).rejects.toThrow();
  });

  it('generates a refresh token whose hash never equals the raw token', () => {
    const result = service.generateRefreshToken();
    expect(result.token).not.toEqual(result.tokenHash);
    expect(result.token.length).toBeGreaterThan(50);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('hashes the same token deterministically', () => {
    const hashA = service.hashToken('same-value');
    const hashB = service.hashToken('same-value');
    expect(hashA).toEqual(hashB);
  });

  it('generates a different opaque token on each call', () => {
    const a = service.generateRefreshToken();
    const b = service.generateRefreshToken();
    expect(a.token).not.toEqual(b.token);
  });
});
