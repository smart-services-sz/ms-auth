import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined');
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const permissionNames = [
  'VIEW_RECLAMOS',
  'MANAGE_RECLAMOS',
  'DELETE_RECLAMOS',
  'VIEW_USERS',
  'VIEW_DETAIL_USER',
  'CREATE_USER',
  'UPDATE_USER',
  'DELETE_USER',
  'TOGGLE_STATUS_USER',
  'VIEW_ROLES',
  'MANAGE_ROLES',
  'VIEW_PERMISSIONS',
  'MANAGE_PERMISSIONS',
];

const roleNames = ['ADMIN', 'AGENT', 'USER'];

async function setUserRoles(userId: string, roleIds: string[]) {
  await prisma.userRole.deleteMany({ where: { userId } });

  if (roleIds.length > 0) {
    await prisma.userRole.createMany({
      data: roleIds.map((roleId) => ({ userId, roleId })),
      skipDuplicates: true,
    });
  }
}

async function setUserPermissions(userId: string, permissionIds: string[]) {
  await prisma.userPermission.deleteMany({ where: { userId } });

  if (permissionIds.length > 0) {
    await prisma.userPermission.createMany({
      data: permissionIds.map((permissionId) => ({ userId, permissionId })),
      skipDuplicates: true,
    });
  }
}

async function setRolePermissions(roleId: string, permissionIds: string[]) {
  await prisma.rolePermission.deleteMany({ where: { roleId } });

  if (permissionIds.length > 0) {
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
      skipDuplicates: true,
    });
  }
}

async function main() {
  for (const name of permissionNames) {
    await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  for (const name of roleNames) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const roleMap = new Map(
    (await prisma.role.findMany({ select: { id: true, name: true } })).map((role) => [role.name, role.id]),
  );
  const permissionMap = new Map(
    (await prisma.permission.findMany({ select: { id: true, name: true } })).map((permission) => [permission.name, permission.id]),
  );

  const adminEmail = 'admin@demo.com';
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: adminPassword,
      name: 'Administrador',
      isActive: true,
    },
  });

  const agentEmail = 'agente@demo.com';
  const agentPassword = await bcrypt.hash('agente123', 10);
  const agent = await prisma.user.upsert({
    where: { email: agentEmail },
    update: {},
    create: {
      email: agentEmail,
      passwordHash: agentPassword,
      name: 'Agente',
      isActive: true,
    },
  });

  const userEmail = 'user@demo.com';
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {},
    create: {
      email: userEmail,
      passwordHash: userPassword,
      name: 'Usuario',
      isActive: true,
    },
  });

  await setUserRoles(admin.id, [roleMap.get('ADMIN')!]);
  await setRolePermissions(
    roleMap.get('ADMIN')!,
    permissionNames.map((permissionName) => permissionMap.get(permissionName)!).filter(Boolean),
  );
  await setUserPermissions(admin.id, []);

  await setUserRoles(agent.id, [roleMap.get('AGENT')!]);
  await setRolePermissions(
    roleMap.get('AGENT')!,
    ['VIEW_RECLAMOS', 'MANAGE_RECLAMOS']
      .map((permissionName) => permissionMap.get(permissionName)!)
      .filter(Boolean),
  );
  await setUserPermissions(agent.id, []);

  await setUserRoles(user.id, [roleMap.get('USER')!]);
  await setRolePermissions(roleMap.get('USER')!, []);
  await setUserPermissions(user.id, []);

  console.log('Seed completado. Credenciales disponibles:');
  console.log(' - admin@demo.com / admin123');
  console.log(' - agente@demo.com / agente123');
  console.log(' - user@demo.com / user123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
