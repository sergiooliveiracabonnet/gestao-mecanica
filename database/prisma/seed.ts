import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ROLES = ['ADMIN', 'MANAGER', 'MECHANIC', 'FRONT_DESK', 'FINANCE'] as const;

const PERMISSIONS: Array<{ key: string; description: string }> = [
  { key: 'dashboard.view', description: 'Visualizar a operação da oficina' },
  { key: 'finance.view', description: 'Visualizar indicadores e relatórios financeiros' },
  { key: 'finance.manage', description: 'Criar e alterar categorias e lançamentos financeiros' },
  { key: 'service_orders.view', description: 'Visualizar ordens de serviço' },
  { key: 'service_orders.manage', description: 'Criar e alterar ordens de serviço' },
  { key: 'service_orders.prices', description: 'Visualizar e alterar preços da OS' },
  { key: 'receipts.manage', description: 'Confirmar e estornar recebimentos' },
  { key: 'appointments.view', description: 'Visualizar agenda' },
  { key: 'appointments.manage', description: 'Criar e alterar agendamentos' },
  { key: 'customers.view', description: 'Visualizar clientes' },
  { key: 'customers.manage', description: 'Criar e alterar clientes' },
  { key: 'vehicles.view', description: 'Visualizar veículos' },
  { key: 'vehicles.manage', description: 'Criar e alterar veículos' },
  { key: 'alerts.view', description: 'Visualizar alertas' },
  { key: 'alerts.manage', description: 'Resolver alertas' },
  { key: 'team.view', description: 'Visualizar equipe' },
  { key: 'team.manage', description: 'Convidar e alterar usuários' },
  { key: 'profiles.manage', description: 'Criar perfis e definir permissões' },
  { key: 'settings.view', description: 'Visualizar configurações da empresa' },
  { key: 'settings.manage', description: 'Alterar configurações da empresa e integrações' },
];

const ROLE_PERMISSIONS: Record<(typeof ROLES)[number], string[]> = {
  ADMIN: PERMISSIONS.map(({ key }) => key),
  MANAGER: [
    'dashboard.view', 'service_orders.view', 'service_orders.manage', 'service_orders.prices',
    'receipts.manage', 'appointments.view', 'appointments.manage', 'customers.view',
    'customers.manage', 'vehicles.view', 'vehicles.manage', 'alerts.view', 'alerts.manage',
    'team.view', 'team.manage',
  ],
  MECHANIC: [
    'dashboard.view', 'service_orders.view', 'service_orders.manage', 'appointments.view',
    'customers.view', 'vehicles.view',
  ],
  FRONT_DESK: [
    'dashboard.view', 'service_orders.view', 'service_orders.manage', 'service_orders.prices',
    'receipts.manage', 'appointments.view', 'appointments.manage', 'customers.view',
    'customers.manage', 'vehicles.view', 'vehicles.manage', 'alerts.view', 'alerts.manage',
  ],
  FINANCE: [
    'dashboard.view', 'finance.view', 'finance.manage', 'receipts.manage',
    'service_orders.view', 'customers.view',
  ],
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
