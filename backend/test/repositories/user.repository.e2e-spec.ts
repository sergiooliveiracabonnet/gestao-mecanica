import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { TenantContextService } from '../../src/shared/tenant-context/tenant-context.service';
import { TenantRepository } from '../../src/modules/iam/repositories/tenant.repository';
import { UserRepository } from '../../src/modules/iam/repositories/user.repository';

// Integração real com Postgres — ver nota em tenant.repository.e2e-spec.ts.
describe('UserRepository (integration)', () => {
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let userRepository: UserRepository;
  let tenantRepository: TenantRepository;
  let tenantId: string;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    tenantContext = new TenantContextService();
    prisma = new PrismaService(tenantContext);
    await prisma.onModuleInit();
    userRepository = new UserRepository(prisma);
    tenantRepository = new TenantRepository(prisma);

    const tenant = await tenantRepository.insert({ name: 'Oficina User Repo Test', document: `doc-${Date.now()}` });
    tenantId = tenant.id;
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.unscoped.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await prisma.unscoped.tenant.delete({ where: { id: tenantId } });
    await prisma.onModuleDestroy();
  });

  function withTenantContext<T>(fn: () => Promise<T>): Promise<T> {
    return tenantContext.run({ tenantId, userId: 'test-actor', role: 'ADMIN' }, fn);
  }

  it('inserts a user and finds it by id', async () => {
    const user = await withTenantContext(() =>
      userRepository.insert({
        tenantId,
        email: `user-${Date.now()}-a@test.com`,
        name: 'Teste A',
        roleId: randomUUID(),
        status: 'active',
        passwordHash: 'hash',
      }),
    );
    createdUserIds.push(user.id);

    const found = await userRepository.byId(user.id);
    expect(found?.email).toBe(user.email);
  });

  it('finds a user by email globally, without needing a tenant context', async () => {
    const email = `user-${Date.now()}-b@test.com`;
    const user = await withTenantContext(() =>
      userRepository.insert({ tenantId, email, name: 'B', roleId: randomUUID(), status: 'active' }),
    );
    createdUserIds.push(user.id);

    const found = await userRepository.byEmail(email);
    expect(found?.id).toBe(user.id);
  });

  it('does not return a soft-deleted user via byId', async () => {
    const user = await withTenantContext(() =>
      userRepository.insert({
        tenantId,
        email: `user-${Date.now()}-c@test.com`,
        name: 'C',
        roleId: randomUUID(),
        status: 'active',
      }),
    );
    createdUserIds.push(user.id);
    await prisma.unscoped.user.update({ where: { id: user.id }, data: { deletedAt: new Date() } });

    expect(await userRepository.byId(user.id)).toBeNull();
  });

  it('lists only users of the current tenant, paginated', async () => {
    for (let i = 0; i < 3; i++) {
      const user = await withTenantContext(() =>
        userRepository.insert({
          tenantId,
          email: `list-user-${Date.now()}-${i}@test.com`,
          name: `List ${i}`,
          roleId: randomUUID(),
          status: 'active',
        }),
      );
      createdUserIds.push(user.id);
    }

    const { items, total } = await withTenantContext(() => userRepository.listByTenant(0, 2));
    expect(items.length).toBeLessThanOrEqual(2);
    expect(total).toBeGreaterThanOrEqual(3);
    expect(items.every((item) => item.tenantId === tenantId)).toBe(true);
  });

  it('activates an invited user via update', async () => {
    const user = await withTenantContext(() =>
      userRepository.insert({
        tenantId,
        email: `invited-${Date.now()}@test.com`,
        name: 'Invited',
        roleId: randomUUID(),
        status: 'invited',
        inviteTokenHash: 'some-hash',
        inviteExpiresAt: new Date(Date.now() + 60_000),
      }),
    );
    createdUserIds.push(user.id);

    await userRepository.update(user.id, { status: 'active', inviteTokenHash: null, inviteExpiresAt: null });

    const found = await userRepository.byId(user.id);
    expect(found?.status).toBe('active');
    expect(found?.inviteTokenHash).toBeNull();
  });
});
