import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();

// ── GET /api/pet-offerings ───────────────────────────────────────────────────
router.get("/", authenticate, async (_req: Request, res: Response): Promise<void> => {
  const offerings = await prisma.petOffering.findMany({
    select: { id: true, name: true, description: true },
    orderBy: { id: "asc" },
  });

  res.json(offerings);
});

export default router;
