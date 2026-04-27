import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ── Serviços ──────────────────────────────────────────────────────────────
  await prisma.petOffering.createMany({
    data: [
      { id: 1, name: 'Banho',         description: 'Banho completo com secagem' },
      { id: 2, name: 'Tosa',          description: 'Tosa higiênica ou na tesoura' },
      { id: 3, name: 'Corte de Unha', description: 'Corte e lixamento das unhas' },
    ],
    skipDuplicates: true,
  });

  // ── Preços por porte/pelo ─────────────────────────────────────────────────
  //  petSize: Pequeno | Médio | Grande
  //  petCoat: Curto | Longo
  const prices = [
    // Banho
    { petOfferingId: 1, petSize: 'p', petCoat: 'curta', price: 40,  duration: 60  },
    { petOfferingId: 1, petSize: 'p', petCoat: 'longa', price: 50,  duration: 75  },
    { petOfferingId: 1, petSize: 'm', petCoat: 'curta', price: 60,  duration: 75  },
    { petOfferingId: 1, petSize: 'm', petCoat: 'longa', price: 75,  duration: 90  },
    { petOfferingId: 1, petSize: 'g', petCoat: 'curta', price: 90,  duration: 90  },
    { petOfferingId: 1, petSize: 'g', petCoat: 'longa', price: 110, duration: 120 },
    // Tosa
    { petOfferingId: 2, petSize: 'p', petCoat: 'curta', price: 50,  duration: 60  },
    { petOfferingId: 2, petSize: 'p', petCoat: 'longa', price: 65,  duration: 75  },
    { petOfferingId: 2, petSize: 'm', petCoat: 'curta', price: 70,  duration: 75  },
    { petOfferingId: 2, petSize: 'm', petCoat: 'longa', price: 90,  duration: 90  },
    { petOfferingId: 2, petSize: 'g', petCoat: 'curta', price: 100, duration: 90  },
    { petOfferingId: 2, petSize: 'g', petCoat: 'longa', price: 130, duration: 120 },
    // Corte de Unha
    { petOfferingId: 3, petSize: 'p', petCoat: 'curta', price: 20,  duration: 20  },
    { petOfferingId: 3, petSize: 'p', petCoat: 'longa', price: 20,  duration: 20  },
    { petOfferingId: 3, petSize: 'm', petCoat: 'curta', price: 25,  duration: 25  },
    { petOfferingId: 3, petSize: 'm', petCoat: 'longa', price: 25,  duration: 25  },
    { petOfferingId: 3, petSize: 'g', petCoat: 'curta', price: 30,  duration: 30  },
    { petOfferingId: 3, petSize: 'g', petCoat: 'longa', price: 30,  duration: 30  },
  ];

  await prisma.petOfferingPriceAndDuration.createMany({
    data: prices,
    skipDuplicates: true,
  });

  // ── Funcionários ──────────────────────────────────────────────────────────
  await prisma.employee.createMany({
    data: [
      { id: 1, name: 'Ana Lima'    },
      { id: 2, name: 'Carlos Souza'},
    ],
    skipDuplicates: true,
  });

  // ── Associa todos os serviços a todos os funcionários ─────────────────────
  const [employees, offerings] = await Promise.all([
    prisma.employee.findMany({ select: { id: true } }),
    prisma.petOffering.findMany({ select: { id: true } }),
  ]);

  for (const emp of employees) {
    await prisma.employee.update({
      where: { id: emp.id },
      data: { petOfferings: { set: offerings.map((o) => ({ id: o.id })) } },
    });
  }

  console.log(`Seed concluído: ${offerings.length} serviços, ${employees.length} funcionários.`);
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
