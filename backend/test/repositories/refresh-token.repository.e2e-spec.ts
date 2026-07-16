import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { TenantContextService } from '../../src/shared/tenant-context/tenant-context.service';
import { RefreshTokenRepository } from '../../src/modules/iam/repositories/refresh-token.repository';

// Integração real com Postgres — ver nota em tenant.repository.e2e-spec.ts.
// refresh_tokens não tem tenant_id, então não precisa de tenant context —
// só de um userId (não validado por FK física, ver SCHEMA.md).
describe('RefreshTokenRepository (integration)', () => {
  let prisma: PrismaService;
  let repository: RefreshTokenRepository;
  const createdIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaService(new TenantContextService());
    await prisma.onModuleInit();
    repository = new RefreshTokenRepository(prisma);
  });

  afterAll(async () => {
    if (createdIds.length > 0) {
      await prisma.unscoped.refreshToken.deleteMany({ where: { id: { in: createdIds } } });
    }
    await prisma.onModuleDestroy();
  });

  it('inserts a refresh token and finds it by hash', async () => {
    const tokenHash = `hash-${Date.now()}-a`;
    const token = await repository.insert({
      userId: randomUUID(),
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
    });
    createdIds.push(token.id);

    const found = await repository.byTokenHash(tokenHash);
    expect(found?.id).toBe(token.id);
    expect(found?.revokedAt).toBeNull();
  });

  it('revokes a token', async () => {
    const token = await repository.insert({
      userId: randomUUID(),
      tokenHash: `hash-${Date.now()}-b`,
      expiresAt: new Date(Date.now() + 60_000),
    });
    createdIds.push(token.id);

    await repository.revoke(token.id);

    const found = await repository.byTokenHash(token.tokenHash);
    expect(found?.revokedAt).not.toBeNull();
  });

  it('revokes every non-revoked token for a user (token family)', async () => {
    const userId = randomUUID();
    const tokenA = await repository.insert({ userId, tokenHash: `hash-${Date.now()}-c1`, expiresAt: new Date(Date.now() + 60_000) });
    const tokenB = await repository.insert({ userId, tokenHash: `hash-${Date.now()}-c2`, expiresAt: new Date(Date.now() + 60_000) });
    createdIds.push(tokenA.id, tokenB.id);

    await repository.revokeAllForUser(userId);

    const foundA = await repository.byTokenHash(tokenA.tokenHash);
    const foundB = await repository.byTokenHash(tokenB.tokenHash);
    expect(foundA?.revokedAt).not.toBeNull();
    expect(foundB?.revokedAt).not.toBeNull();
  });

  it('returns null for an unknown token hash', async () => {
    expect(await repository.byTokenHash('does-not-exist')).toBeNull();
  });
});
