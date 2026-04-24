/**
 * Assigns all PetOfferings to all Employees.
 * Run with: npx ts-node scripts/assign-all-services-to-employees.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [employees, offerings] = await Promise.all([
    prisma.employee.findMany({ select: { id: true, name: true } }),
    prisma.petOffering.findMany({ select: { id: true, description: true } }),
  ]);

  if (employees.length === 0) {
    console.log('No employees found.');
    return;
  }
  if (offerings.length === 0) {
    console.log('No pet offerings found.');
    return;
  }

  console.log(`Assigning ${offerings.length} services to ${employees.length} employees...`);

  for (const emp of employees) {
    await prisma.employee.update({
      where: { id: emp.id },
      data: {
        petOfferings: {
          set: offerings.map((o) => ({ id: o.id })),
        },
      },
    });
    console.log(`  ✓ ${emp.name} — all services assigned`);
  }

  console.log('Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
