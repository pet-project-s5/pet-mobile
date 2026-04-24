import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [employees, offerings] = await Promise.all([
    prisma.employee.findMany({ select: { id: true, name: true } }),
    prisma.petOffering.findMany({ select: { id: true } }),
  ]);

  if (employees.length === 0 || offerings.length === 0) return;

  for (const emp of employees) {
    await prisma.employee.update({
      where: { id: emp.id },
      data: { petOfferings: { set: offerings.map((o) => ({ id: o.id })) } },
    });
  }

  console.log(`Seed: ${employees.length} funcionários → ${offerings.length} serviços cada.`);
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
