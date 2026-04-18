import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";
import { authenticate } from "../middleware/auth";

const router = Router();

// ── CPF validation (Brazilian algorithm) ────────────────────────────────────
function isValidCpf(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false; // all same digits

  const calcDigit = (base: string, len: number): number => {
    let sum = 0;
    for (let i = 0; i < len; i++) {
      sum += parseInt(base[i]) * (len + 1 - i);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 || remainder === 11 ? 0 : remainder;
  };

  const d1 = calcDigit(cleaned, 9);
  const d2 = calcDigit(cleaned, 10);

  return d1 === parseInt(cleaned[9]) && d2 === parseInt(cleaned[10]);
}

// ── Schemas ──────────────────────────────────────────────────────────────────
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const OwnerCreateSchema = z.object({
  name: z.string().min(1),
  cpf: z.string().min(11).max(14),
  phoneNumber: z.string().min(10),
  email: z.string().email(),
  password: z.string().min(6),
  cep: z.string().min(8),
  street: z.string().min(1),
  number: z.string().min(1),
  neighborhood: z.string().min(1),
  complement: z.string().optional(),
});

// ── POST /api/owners/login ───────────────────────────────────────────────────
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
    return;
  }

  const { email, password } = parsed.data;

  const owner = await prisma.owner.findUnique({ where: { email } });
  if (!owner) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const passwordMatch = await bcrypt.compare(password, owner.password);
  if (!passwordMatch) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const token = signToken({ id: owner.id, email: owner.email });

  res.json({
    id: owner.id,
    name: owner.name,
    email: owner.email,
    token,
    isAdmin: owner.isAdm,
  });
});

// ── POST /api/owners  (register) ─────────────────────────────────────────────
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const parsed = OwnerCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;
  const cleanedCpf = data.cpf.replace(/\D/g, "");

  if (!isValidCpf(cleanedCpf)) {
    res.status(400).json({ message: "Invalid CPF" });
    return;
  }

  // Conflict checks
  const existingEmail = await prisma.owner.findUnique({ where: { email: data.email } });
  if (existingEmail) {
    res.status(409).json({ message: "Email already in use" });
    return;
  }

  const existingCpf = await prisma.owner.findUnique({ where: { cpf: cleanedCpf } });
  if (existingCpf) {
    res.status(409).json({ message: "CPF already registered" });
    return;
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const owner = await prisma.owner.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      cpf: cleanedCpf,
      phoneNumber: data.phoneNumber,
      cep: data.cep,
      street: data.street,
      number: data.number,
      neighborhood: data.neighborhood,
      complement: data.complement ?? null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      cpf: true,
      phoneNumber: true,
      cep: true,
      street: true,
      number: true,
      neighborhood: true,
      complement: true,
      isAdm: true,
      createdAt: true,
    },
  });

  res.status(201).json(owner);
});

// ── GET /api/owners/me ───────────────────────────────────────────────────────
router.get("/me", authenticate, async (req: Request, res: Response): Promise<void> => {
  const ownerId = req.user!.id;

  const owner = await prisma.owner.findUnique({
    where: { id: ownerId },
    select: {
      id: true,
      name: true,
      email: true,
      cpf: true,
      phoneNumber: true,
      cep: true,
      street: true,
      number: true,
      neighborhood: true,
      complement: true,
      isAdm: true,
      createdAt: true,
    },
  });

  if (!owner) {
    res.status(404).json({ message: "Owner not found" });
    return;
  }

  res.json(owner);
});

export default router;
