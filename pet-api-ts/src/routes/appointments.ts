import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

interface BusinessHours {
  open: number;   // BRT minutes since midnight
  close: number;
}

function getBusinessHours(dayOfWeek: number): BusinessHours | null {
  if (dayOfWeek === 0) return null;                          // Sunday — closed
  if (dayOfWeek === 6) return { open: 9 * 60, close: 13 * 60 }; // Saturday
  return { open: 9 * 60, close: 18 * 60 };                  // Mon–Fri
}

/** 30-minute slots (BRT minutes-since-midnight) that fit the full duration. */
function generateSlots(hours: BusinessHours, durationMinutes: number): number[] {
  const slots: number[] = [];
  for (let t = hours.open; t + durationMinutes <= hours.close; t += 30) {
    slots.push(t);
  }
  return slots;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

/**
 * Parse a datetime string sent as BRT (UTC-3).
 * Appends -03:00 if no timezone indicator is present.
 */
function parseBRTDate(str: string): Date {
  const hasTZ = /Z$|[+-]\d{2}:?\d{2}$/.test(str);
  return new Date(hasTZ ? str : `${str}-03:00`);
}

/** UTC Date → BRT minutes-since-midnight. */
function toBRTMinutes(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes() - 3 * 60;
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const AvailableTimesSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  petOfferingIds: z.array(z.number().int().positive()).min(1),
});

const AppointmentCreateSchema = z.object({
  petId: z.number().int().positive(),
  employee_id: z.number().int().positive(),
  petOfferingNames: z.string().min(1),
  totalPrice: z.number().positive(),
  observations: z.string().optional(),
  startDateTime: z.string().min(1),
  durationMinutes: z.number().int().positive(),
});

const AppointmentUpdateSchema = AppointmentCreateSchema.partial();

// ── POST /api/appointments/available-times/:petId ───────────────────────────
router.post(
  "/available-times/:petId",
  async (req: Request, res: Response): Promise<void> => {
    const petId = parseInt(req.params.petId, 10);
    if (isNaN(petId)) { res.status(400).json({ message: "Invalid petId" }); return; }

    const parsed = AvailableTimesSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
      return;
    }

    const { date: dateStr, petOfferingIds } = parsed.data;

    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) { res.status(404).json({ message: "Pet not found" }); return; }

    const requestedDate = parseLocalDate(dateStr);
    const today = startOfDay(new Date());
    if (requestedDate < today) { res.json([]); return; }

    const dayOfWeek = requestedDate.getDay();
    const hours = getBusinessHours(dayOfWeek);
    if (!hours) { res.json([]); return; }  // Sunday

    // Price + duration for this pet's size/coat
    const priceRows = await prisma.petOfferingPriceAndDuration.findMany({
      where: { petOfferingId: { in: petOfferingIds }, petSize: pet.size, petCoat: pet.coat },
    });

    const coveredIds = new Set(priceRows.map((r) => r.petOfferingId));
    if (petOfferingIds.some((id) => !coveredIds.has(id)) || priceRows.length === 0) {
      res.json([]); return;
    }

    const totalPrice    = priceRows.reduce((s, r) => s + r.price, 0);
    const totalDuration = priceRows.reduce((s, r) => s + r.duration, 0);

    if (totalPrice <= 0 || totalDuration <= 0) { res.json([]); return; }

    // Duration exceeds the entire business day → impossible to schedule
    const maxBusinessMinutes = hours.close - hours.open;
    if (totalDuration > maxBusinessMinutes) {
      res.status(422).json({
        error: "DURATION_TOO_LONG",
        totalDuration,
        maxDuration: maxBusinessMinutes,
      });
      return;
    }

    const offerings = await prisma.petOffering.findMany({
      where: { id: { in: petOfferingIds } },
      select: { id: true, description: true },
    });
    const petOfferingNames = offerings.map((o) => o.description).join(", ");

    // Employees who offer ALL requested services
    const employees = await prisma.employee.findMany({
      include: { petOfferings: { select: { id: true } } },
    });
    const eligibleEmployees = employees.filter((emp) => {
      const empIds = new Set(emp.petOfferings.map((o) => o.id));
      return petOfferingIds.every((id) => empIds.has(id));
    });
    if (eligibleEmployees.length === 0) { res.json([]); return; }

    // Base time slots for this duration
    const baseSlots = generateSlots(hours, totalDuration);

    const dayStart = startOfDay(requestedDate);
    const dayEnd   = endOfDay(requestedDate);

    // Past-slot filter for today
    const isToday = requestedDate.getTime() === today.getTime();
    const nowBRT  = isToday
      ? (new Date().getUTCHours() * 60 + new Date().getUTCMinutes()) - 3 * 60
      : -1;

    const result: {
      employee: { id: number; name: string };
      times: string[];
      durationTime: number;
      petOfferingNames: string;
      servicePrice: number;
    }[] = [];

    for (const emp of eligibleEmployees) {
      // Only non-cancelled appointments block the employee's time
      const busyAppointments = await prisma.appointment.findMany({
        where: {
          employeeId: emp.id,
          status: { not: "CANCELLED" },
          startDateTime: { gte: dayStart, lte: dayEnd },
        },
        select: { startDateTime: true, endDateTime: true },
      });

      const busyRanges = busyAppointments.map((a) => ({
        start: toBRTMinutes(a.startDateTime),
        end:   toBRTMinutes(a.endDateTime),
      }));

      const availableSlots = baseSlots.filter((slotStart) => {
        if (isToday && slotStart <= nowBRT) return false;
        const slotEnd = slotStart + totalDuration;
        return !busyRanges.some((b) => slotStart < b.end && slotEnd > b.start);
      });

      if (availableSlots.length === 0) continue;

      result.push({
        employee: { id: emp.id, name: emp.name },
        times: availableSlots.map((m) => {
          const h = String(Math.floor(m / 60)).padStart(2, "0");
          const mm = String(m % 60).padStart(2, "0");
          return `${h}:${mm}:00`;
        }),
        durationTime: totalDuration,
        petOfferingNames,
        servicePrice: totalPrice,
      });
    }

    res.json(result);
  }
);

// ── GET /api/appointments/owner/:ownerId ────────────────────────────────────
router.get(
  "/owner/:ownerId",
  async (req: Request, res: Response): Promise<void> => {
    const ownerId = parseInt(req.params.ownerId, 10);
    if (isNaN(ownerId)) { res.status(400).json({ message: "Invalid ownerId" }); return; }

    const page = parseInt((req.query.page as string) ?? "0", 10);
    const size = parseInt((req.query.size as string) ?? "10", 10);
    const skip = page * size;

    const ownerPets = await prisma.pet.findMany({ where: { ownerId }, select: { id: true } });
    const petIds = ownerPets.map((p) => p.id);

    // Exclude cancelled appointments from the customer's list
    const where = { petId: { in: petIds }, status: { not: "CANCELLED" } };

    const [appointments, totalElements] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          pet:      { select: { id: true, name: true, species: true } },
          employee: { select: { id: true, name: true } },
        },
        orderBy: { startDateTime: "desc" },
        skip,
        take: size,
      }),
      prisma.appointment.count({ where }),
    ]);

    const totalPages = Math.ceil(totalElements / size);
    res.json({
      content: appointments,
      totalElements,
      totalPages,
      size,
      number: page,
      first: page === 0,
      last: page >= totalPages - 1,
      empty: appointments.length === 0,
    });
  }
);

// ── POST /api/appointments ───────────────────────────────────────────────────
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const parsed = AppointmentCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
    return;
  }

  const {
    petId, employee_id, petOfferingNames, totalPrice,
    observations, startDateTime: startDateTimeStr, durationMinutes,
  } = parsed.data;

  const [pet, employee] = await Promise.all([
    prisma.pet.findUnique({ where: { id: petId } }),
    prisma.employee.findUnique({ where: { id: employee_id } }),
  ]);
  if (!pet)      { res.status(404).json({ message: "Pet not found" }); return; }
  if (!employee) { res.status(404).json({ message: "Employee not found" }); return; }

  const startDateTime = parseBRTDate(startDateTimeStr);
  const endDateTime   = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

  // Prevent double-booking the employee
  const conflict = await prisma.appointment.findFirst({
    where: {
      employeeId: employee_id,
      status: { not: "CANCELLED" },
      startDateTime: { lt: endDateTime },
      endDateTime:   { gt: startDateTime },
    },
  });
  if (conflict) {
    res.status(409).json({ message: "O profissional já tem um agendamento nesse horário." });
    return;
  }

  const appointment = await prisma.appointment.create({
    data: {
      petId,
      employeeId: employee_id,
      petOfferingNames,
      totalPrice,
      observations: observations ?? null,
      startDateTime,
      endDateTime,
      status: "CONFIRMED",
    },
    include: {
      pet:      { select: { id: true, name: true, species: true } },
      employee: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(appointment);
});

// ── DELETE /api/appointments/:id  (soft-cancel) ─────────────────────────────
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ message: "Invalid id" }); return; }

  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) { res.status(404).json({ message: "Appointment not found" }); return; }

  await prisma.appointment.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  res.status(204).send();
});

// ── PUT /api/appointments/:id ────────────────────────────────────────────────
router.put("/:id", async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ message: "Invalid id" }); return; }

  const parsed = AppointmentUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
    return;
  }

  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) { res.status(404).json({ message: "Appointment not found" }); return; }

  const updateData: Record<string, unknown> = {};

  if (parsed.data.petId !== undefined)             updateData.petId = parsed.data.petId;
  if (parsed.data.employee_id !== undefined)        updateData.employeeId = parsed.data.employee_id;
  if (parsed.data.petOfferingNames !== undefined)   updateData.petOfferingNames = parsed.data.petOfferingNames;
  if (parsed.data.totalPrice !== undefined)         updateData.totalPrice = parsed.data.totalPrice;
  if (parsed.data.observations !== undefined)       updateData.observations = parsed.data.observations;

  if (parsed.data.startDateTime !== undefined) {
    const start = parseBRTDate(parsed.data.startDateTime);
    updateData.startDateTime = start;
    if (parsed.data.durationMinutes !== undefined) {
      updateData.endDateTime = new Date(start.getTime() + parsed.data.durationMinutes * 60 * 1000);
    }
  } else if (parsed.data.durationMinutes !== undefined) {
    updateData.endDateTime = new Date(
      existing.startDateTime.getTime() + parsed.data.durationMinutes * 60 * 1000
    );
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: updateData,
    include: {
      pet:      { select: { id: true, name: true, species: true } },
      employee: { select: { id: true, name: true } },
    },
  });

  res.json(appointment);
});

export default router;
