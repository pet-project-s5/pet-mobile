import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // ── Pet Offerings ────────────────────────────────────────────────────────────
  const offeringsData = [
    {
      id: 1,
      name: "Banho completo conforme o porte e pelagem do pet",
      description: "Banho",
    },
    {
      id: 2,
      name: "Tosa para manter a higiene das regioes sensiveis do pet",
      description: "Tosa higienica",
    },
    {
      id: 3,
      name: "Tosa geral do corpo com maquina conforme padrao da raca",
      description: "Tosa na maquina",
    },
    {
      id: 4,
      name: "Corpinho na maquina com cabeca, rabo e pes na tesoura",
      description: "Tosa bebe",
    },
    {
      id: 5,
      name: "Tosa higienica com adicional de patinhas e regionais",
      description: "Botinha",
    },
    {
      id: 6,
      name: "Desembolo dos pelos do pet",
      description: "Desembolo",
    },
    {
      id: 7,
      name: "Escovacao dos dentes do pet",
      description: "Escovacao dentaria",
    },
    {
      id: 8,
      name: "Hidratacao dos pelos",
      description: "Hidratacao",
    },
    {
      id: 9,
      name: "Corte das unhas do pet",
      description: "Corte de unha",
    },
  ];

  for (const offering of offeringsData) {
    await prisma.petOffering.upsert({
      where: { id: offering.id },
      update: offering,
      create: offering,
    });
  }
  console.log("Pet offerings seeded.");

  // ── Prices & Durations (90 records) ─────────────────────────────────────────
  // Format: [petOfferingId, petSize, petCoat, price, duration(min)]
  const sizes = ["pp", "p", "m", "g", "gg"];
  const coats = ["curta", "longa"];

  // Offering 1 – Banho
  const bathPrices: Record<string, number[]> = {
    pp: [35, 40],   // [curta, longa]
    p:  [45, 55],
    m:  [55, 65],
    g:  [65, 80],
    gg: [80, 100],
  };
  const bathDurations: Record<string, number[]> = {
    pp: [30, 45],
    p:  [45, 60],
    m:  [60, 75],
    g:  [75, 90],
    gg: [90, 120],
  };

  // Offering 2 – Tosa higienica
  const tosaHigPrices: Record<string, number[]> = {
    pp: [25, 30],
    p:  [30, 40],
    m:  [40, 50],
    g:  [50, 60],
    gg: [60, 75],
  };
  const tosaHigDurations: Record<string, number[]> = {
    pp: [30, 30],
    p:  [30, 45],
    m:  [45, 60],
    g:  [60, 75],
    gg: [75, 90],
  };

  // Offering 3 – Tosa na maquina
  const tosaMaqPrices: Record<string, number[]> = {
    pp: [40, 50],
    p:  [50, 65],
    m:  [65, 80],
    g:  [80, 100],
    gg: [100, 130],
  };
  const tosaMaqDurations: Record<string, number[]> = {
    pp: [45, 60],
    p:  [60, 75],
    m:  [75, 90],
    g:  [90, 120],
    gg: [120, 150],
  };

  // Offering 4 – Tosa bebe
  const tosaBebePrices: Record<string, number[]> = {
    pp: [45, 55],
    p:  [55, 70],
    m:  [70, 85],
    g:  [85, 110],
    gg: [110, 140],
  };
  const tosaBebeDurations: Record<string, number[]> = {
    pp: [45, 60],
    p:  [60, 75],
    m:  [75, 90],
    g:  [90, 120],
    gg: [120, 150],
  };

  // Offering 5 – Botinha
  const botinhaPrices: Record<string, number[]> = {
    pp: [30, 35],
    p:  [35, 45],
    m:  [45, 55],
    g:  [55, 65],
    gg: [65, 80],
  };
  const botinhaDurations: Record<string, number[]> = {
    pp: [30, 30],
    p:  [30, 45],
    m:  [45, 60],
    g:  [60, 75],
    gg: [75, 90],
  };

  // Offering 6 – Desembolo
  const desemboloPrices: Record<string, number[]> = {
    pp: [20, 25],
    p:  [25, 35],
    m:  [35, 45],
    g:  [45, 60],
    gg: [60, 80],
  };
  const desemboloDurations: Record<string, number[]> = {
    pp: [30, 45],
    p:  [45, 60],
    m:  [60, 90],
    g:  [90, 120],
    gg: [120, 150],
  };

  // Offering 7 – Escovacao dentaria
  const escovaoPrices: Record<string, number[]> = {
    pp: [15, 15],
    p:  [15, 15],
    m:  [20, 20],
    g:  [20, 20],
    gg: [25, 25],
  };
  const escovaDurations: Record<string, number[]> = {
    pp: [15, 15],
    p:  [15, 15],
    m:  [15, 15],
    g:  [15, 15],
    gg: [15, 15],
  };

  // Offering 8 – Hidratacao
  const hidratacaoPrices: Record<string, number[]> = {
    pp: [20, 25],
    p:  [25, 35],
    m:  [35, 45],
    g:  [45, 55],
    gg: [55, 70],
  };
  const hidratacaoDurations: Record<string, number[]> = {
    pp: [20, 30],
    p:  [30, 40],
    m:  [40, 50],
    g:  [50, 60],
    gg: [60, 75],
  };

  // Offering 9 – Corte de unha
  const unhasPrices: Record<string, number[]> = {
    pp: [10, 10],
    p:  [10, 10],
    m:  [15, 15],
    g:  [15, 15],
    gg: [20, 20],
  };
  const unhasDurations: Record<string, number[]> = {
    pp: [10, 10],
    p:  [10, 10],
    m:  [10, 10],
    g:  [10, 10],
    gg: [15, 15],
  };

  const offeringPriceMap: {
    id: number;
    prices: Record<string, number[]>;
    durations: Record<string, number[]>;
  }[] = [
    { id: 1, prices: bathPrices,        durations: bathDurations },
    { id: 2, prices: tosaHigPrices,     durations: tosaHigDurations },
    { id: 3, prices: tosaMaqPrices,     durations: tosaMaqDurations },
    { id: 4, prices: tosaBebePrices,    durations: tosaBebeDurations },
    { id: 5, prices: botinhaPrices,     durations: botinhaDurations },
    { id: 6, prices: desemboloPrices,   durations: desemboloDurations },
    { id: 7, prices: escovaoPrices,     durations: escovaDurations },
    { id: 8, prices: hidratacaoPrices,  durations: hidratacaoDurations },
    { id: 9, prices: unhasPrices,       durations: unhasDurations },
  ];

  // Delete existing prices to avoid conflicts on re-seed
  await prisma.petOfferingPriceAndDuration.deleteMany({});

  for (const offering of offeringPriceMap) {
    for (const size of sizes) {
      for (let ci = 0; ci < coats.length; ci++) {
        const coat = coats[ci];
        await prisma.petOfferingPriceAndDuration.create({
          data: {
            petOfferingId: offering.id,
            petSize: size,
            petCoat: coat,
            price: offering.prices[size][ci],
            duration: offering.durations[size][ci],
          },
        });
      }
    }
  }
  console.log("Pet offering prices seeded (90 records).");

  // ── Employees ────────────────────────────────────────────────────────────────
  const employeesData = [
    { id: 1, name: "Ana Lima",       offeringIds: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
    { id: 2, name: "Carlos Souza",   offeringIds: [1, 2, 5, 7, 8, 9] },
    { id: 3, name: "Fernanda Costa", offeringIds: [1, 2, 3, 4, 5, 6, 8] },
    { id: 4, name: "Juliana Rocha",  offeringIds: [1, 2, 5, 8, 9] },
    { id: 5, name: "Marcelo Dias",   offeringIds: [6, 7, 8, 9] },
  ];

  for (const emp of employeesData) {
    await prisma.employee.upsert({
      where: { id: emp.id },
      update: {
        name: emp.name,
        petOfferings: {
          set: emp.offeringIds.map((oid) => ({ id: oid })),
        },
      },
      create: {
        id: emp.id,
        name: emp.name,
        petOfferings: {
          connect: emp.offeringIds.map((oid) => ({ id: oid })),
        },
      },
    });
  }
  console.log("Employees seeded.");

  // ── Test Owner ───────────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash("123456", 10);

  await prisma.owner.upsert({
    where: { email: "teste@cuddle.com" },
    update: {},
    create: {
      name: "Teste Cuddle",
      email: "teste@cuddle.com",
      password: hashedPassword,
      cpf: "00000000000",
      phoneNumber: "11999999999",
      cep: "01310-100",
      street: "Avenida Paulista",
      number: "1000",
      neighborhood: "Bela Vista",
      complement: "Apto 42",
      isAdm: false,
    },
  });
  console.log("Test owner seeded: teste@cuddle.com / 123456");

  console.log("Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
