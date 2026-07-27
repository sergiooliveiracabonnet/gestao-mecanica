import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ROLES = ['ADMIN', 'MANAGER', 'MECHANIC', 'FRONT_DESK'] as const;

const PERMISSIONS: Array<{ key: string; description: string }> = [
  { key: 'users.invite', description: 'Convidar novos usuários para o tenant' },
  { key: 'users.list', description: 'Listar usuários do tenant' },
  { key: 'users.manage', description: 'Gerenciar (desabilitar/reativar) usuários do tenant' },
];

const ROLE_PERMISSIONS: Record<(typeof ROLES)[number], string[]> = {
  ADMIN: ['users.invite', 'users.list', 'users.manage'],
  MANAGER: ['users.invite', 'users.list'],
  MECHANIC: [],
  FRONT_DESK: [],
};

async function main() {
  for (const name of ROLES) {
    const existingRole = await prisma.role.findFirst({
      where: { name, tenantId: null, deletedAt: null },
      select: { id: true },
    });

    if (existingRole) {
      await prisma.role.update({
        where: { id: existingRole.id },
        data: { baseRole: name, isSystem: true },
      });
    } else {
      await prisma.role.create({
        data: { name, baseRole: name, isSystem: true },
      });
    }
  }

  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description },
      create: permission,
    });
  }

  const roles = await prisma.role.findMany({
    where: { tenantId: null, deletedAt: null },
  });
  const permissions = await prisma.permission.findMany();

  for (const roleName of ROLES) {
    const role = roles.find((candidate) => candidate.name === roleName);
    if (!role) continue;

    for (const permissionKey of ROLE_PERMISSIONS[roleName]) {
      const permission = permissions.find((candidate) => candidate.key === permissionKey);
      if (!permission) continue;

      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  console.log(`Seed concluído: ${roles.length} papéis, ${permissions.length} permissions.`);
}

main()
  .catch((error) => {
    console.error('Falha ao rodar o seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
