import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/shared/prisma/prisma.service';
import { TenantContextService } from '../src/shared/tenant-context/tenant-context.service';
import { TenantRepository } from '../src/modules/iam/repositories/tenant.repository';
import { UserRepository } from '../src/modules/iam/repositories/user.repository';

// Teste dedicado exigido pelo épico (risco: "vazamento de dados entre
// tenants por bug no Prisma Middleware"). Precisa de Postgres real — ver
// nota em test/repositories/tenant.repository.e2e-spec.ts.
describe('Multi-tenant isolation (integration)', () => {
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let tenantRepository: TenantRepository;
  let userRepository: UserRepository;

  let tenantA: { id: string };
  let tenantB: { id: string };
  let userA: { id: string; tenantId: string; email: string };
  let userB: { id: string; tenantId: string; email: string };

  beforeAll(async () => {
    tenantContext = new TenantContextService();
    prisma = new PrismaService(tenantContext);
    await prisma.onModuleInit();
    tenantRepository = new TenantRepository(prisma);
    userRepository = new UserRepository(prisma);

    tenantA = await tenantRepository.insert({ name: 'Oficina A', document: `doc-${Date.now()}-a` });
    tenantB = await tenantRepository.insert({ name: 'Oficina B', document: `doc-${Date.now()}-b` });

    userA = await userRepository.insert({
      tenantId: tenantA.id,
      email: `user-a-${Date.now()}@test.com`,
      name: 'User A',
      roleId: randomUUID(),
      status: 'active',
    });
    userB = await userRepository.insert({
      tenantId: tenantB.id,
      email: `user-b-${Date.now()}@test.com`,
      name: 'User B',
      roleId: randomUUID(),
      status: 'active',
    });
  });

  afterAll(async () => {
    await prisma.unscoped.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    await prisma.unscoped.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });
    await prisma.onModuleDestroy();
  });

  it('lists only the current tenant\'s users, never the other tenant\'s', async () => {
    const { items } = await tenantContext.run({ tenantId: tenantA.id, userId: 'actor-a', role: 'ADMIN' }, () =>
      userRepository.listByTenant(0, 100),
    );

    expect(items.some((user) => user.id === userA.id)).toBe(true);
    expect(items.some((user) => user.id === userB.id)).toBe(false);
  });

  it('returns null when looking up another tenant\'s user by id, even with the correct id', async () => {
    const found = await tenantContext.run({ tenantId: tenantA.id, userId: 'actor-a', role: 'ADMIN' }, () =>
      userRepository.byId(userB.id),
    );

    expect(found).toBeNull();
  });

  it('forces created rows into the active tenant, even if a caller passes a different tenantId', async () => {
    const created = await tenantContext.run({ tenantId: tenantA.id, userId: 'actor-a', role: 'ADMIN' }, () =>
      userRepository.insert({
        // tenantId errado de propósito — simula um bug/tentativa de escrita cruzada.
        tenantId: tenantB.id,
        email: `cross-write-${Date.now()}@test.com`,
        name: 'Cross Write Attempt',
        roleId: randomUUID(),
        status: 'active',
      }),
    );

    expect(created.tenantId).toBe(tenantA.id);
    expect(created.tenantId).not.toBe(tenantB.id);

    await prisma.unscoped.user.delete({ where: { id: created.id } });
  });

  it('byEmail (global lookup) still finds users across tenants — it is intentionally unscoped', async () => {
    const found = await tenantContext.run({ tenantId: tenantA.id, userId: 'actor-a', role: 'ADMIN' }, () =>
      userRepository.byEmail(userB.email),
    );

    expect(found?.id).toBe(userB.id);
  });
});
