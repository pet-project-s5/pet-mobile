import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();

// All pet routes require auth
router.use(authenticate);

// ── Schemas ──────────────────────────────────────────────────────────────────
const PetCreateSchema = z.object({
  name: z.string().min(1),
  species: z.string().min(1),
  breed: z.string().min(1),
  sex: z.string().min(1),
  age: z.number().int().nonnegative(),
  size: z.string().min(1),
  coat: z.string().min(1),
});

const PetUpdateSchema = PetCreateSchema.partial();

// ── GET /api/pets/all/:ownerId ───────────────────────────────────────────────
router.get("/all/:ownerId", async (req: Request, res: Response): Promise<void> => {
  const ownerId = parseInt(req.params.ownerId, 10);
  if (isNaN(ownerId)) {
    res.status(400).json({ message: "Invalid ownerId" });
    return;
  }

  const pets = await prisma.pet.findMany({
    where: { ownerId },
    orderBy: { createdAt: "asc" },
  });

  if (pets.length === 0) {
    // Frontend expects an empty array (204 equivalent mapped to 200 + [])
    res.status(200).json([]);
    return;
  }

  res.json(pets);
});

// ── GET /api/pets/:id/:ownerId ───────────────────────────────────────────────
router.get("/:id/:ownerId", async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const ownerId = parseInt(req.params.ownerId, 10);

  if (isNaN(id) || isNaN(ownerId)) {
    res.status(400).json({ message: "Invalid id or ownerId" });
    return;
  }

  const pet = await prisma.pet.findFirst({
    where: { id, ownerId },
  });

  if (!pet) {
    res.status(404).json({ message: "Pet not found" });
    return;
  }

  res.json(pet);
});

// ── POST /api/pets/:ownerId ──────────────────────────────────────────────────
router.post("/:ownerId", async (req: Request, res: Response): Promise<void> => {
  const ownerId = parseInt(req.params.ownerId, 10);
  if (isNaN(ownerId)) {
    res.status(400).json({ message: "Invalid ownerId" });
    return;
  }

  const parsed = PetCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
    return;
  }

  const owner = await prisma.owner.findUnique({ where: { id: ownerId } });
  if (!owner) {
    res.status(404).json({ message: "Owner not found" });
    return;
  }

  const pet = await prisma.pet.create({
    data: {
      ...parsed.data,
      ownerId,
    },
  });

  res.status(201).json(pet);
});

// ── PUT /api/pets/:id ────────────────────────────────────────────────────────
router.put("/:id", async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }

  const parsed = PetUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
    return;
  }

  const existing = await prisma.pet.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ message: "Pet not found" });
    return;
  }

  const pet = await prisma.pet.update({
    where: { id },
    data: parsed.data,
  });

  res.json(pet);
});

export default router;
