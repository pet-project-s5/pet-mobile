import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse a "YYYY-MM-DD" string into a local-midnight Date */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Format a Date as "HH:MM:SS" */
function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

interface BusinessHours {
  open: number;   // minutes since midnight
  close: number;
}

function getBusinessHours(dayOfWeek: number): BusinessHours | null {
  // 0 = Sunday
  if (dayOfWeek === 0) return null;
  // 6 = Saturday
  if (dayOfWeek === 6) return { open: 9 * 60, close: 13 * 60 };
  // Mon–Fri
  return { open: 9 * 60, close: 18 * 60 };
}

/** Generate 30-min slots (in minutes-since-midnight) within business hours
 *  such that each slot FULLY fits before closeTime given the service duration.
 */
function generateSlots(hours: BusinessHours, durationMinutes: number): number[] {
  const slots: number[] = [];
  const step = 30;
  for (let t = hours.open; t + durationMinutes <= hours.close; t += step) {
    slots.push(t);
  }
  return slots;
}

/** Return the start of the day (midnight) in a Date */
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Return the end of the day (23:59:59.999) */
function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
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
    if (isNaN(petId)) {
      res.status(400).json({ message: "Invalid petId" });
      return;
    }

    const parsed = AvailableTimesSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
      return;
    }

    const { date: dateStr, petOfferingIds } = parsed.data;

    // Resolve pet
    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) {
      res.status(404).json({ message: "Pet not found" });
      return;
    }

    // Date checks
    const requestedDate = parseLocalDate(dateStr);
    const today = startOfDay(new Date());

    if (requestedDate < today) {
      // Past date
      res.json([]);
      return;
    }

    const dayOfWeek = requestedDate.getDay();
    const hours = getBusinessHours(dayOfWeek);
    if (!hours) {
      // Sunday
      res.json([]);
      return;
    }

    // Calculate total price and duration for the pet's size & coat
    const priceRows = await prisma.petOfferingPriceAndDuration.findMany({
      where: {
        petOfferingId: { in: petOfferingIds },
        petSize: pet.size,
        petCoat: pet.coat,
      },
    });

    // Check we have a price row for every requested offering
    const coveredOfferingIds = new Set(priceRows.map((r) => r.petOfferingId));
    const allCovered = petOfferingIds.every((id) => coveredOfferingIds.has(id));
    if (!allCovered || priceRows.length === 0) {
      res.json([]);
      return;
    }

    const totalPrice = priceRows.reduce((sum, r) => sum + r.price, 0);
    const totalDuration = priceRows.reduce((sum, r) => sum + r.duration, 0);

    if (totalPrice <= 0 || totalDuration <= 0) {
      res.json([]);
      return;
    }

    // Get offering names (joined)
    const offerings = await prisma.petOffering.findMany({
      where: { id: { in: petOfferingIds } },
      select: { id: true, description: true },
    });
    const petOfferingNames = offerings.map((o) => o.description).join(", ");

    // Find employees who offer ALL requested petOfferingIds
    const employees = await prisma.employee.findMany({
      include: { petOfferings: { select: { id: true } } },
    });

    const eligibleEmployees = employees.filter((emp) => {
      const empOfferingIds = new Set(emp.petOfferings.map((o) => o.id));
      return petOfferingIds.every((id) => empOfferingIds.has(id));
    });

    if (eligibleEmployees.length === 0) {
      res.json([]);
      return;
    }

    // Generate base slots
    const baseSlots = generateSlots(hours, totalDuration);

    // For each eligible employee, remove conflicting slots
    const dayStart = startOfDay(requestedDate);
    const dayEnd = endOfDay(requestedDate);

    const result: {
      employee: { id: number; name: string };
      times: string[];
      durationTime: number;
      petOfferingNames: string;
      servicePrice: number;
    }[] = [];

    for (const emp of eligibleEmployees) {
      // Fetch busy appointments for this employee that day
      const busyAppointments = await prisma.appointment.findMany({
        where: {
          employeeId: emp.id,
          startDateTime: { gte: dayStart, lte: dayEnd },
        },
        select: { startDateTime: true, endDateTime: true },
      });

      // Convert busy appointments to minute ranges
      const busyRanges = busyAppointments.map((appt) => ({
        start:
          appt.startDateTime.getHours() * 60 + appt.startDateTime.getMinutes(),
        end:
          appt.endDateTime.getHours() * 60 + appt.endDateTime.getMinutes(),
      }));

      // Filter out conflicting slots
      const availableSlots = baseSlots.filter((slotStart) => {
        const slotEnd = slotStart + totalDuration;
        return !busyRanges.some(
          (busy) => slotStart < busy.end && slotEnd > busy.start
        );
      });

      if (availableSlots.length === 0) continue;

      // Convert slots to time strings
      const times = availableSlots.map((minutes) => {
        const h = String(Math.floor(minutes / 60)).padStart(2, "0");
        const m = String(minutes % 60).padStart(2, "0");
        return `${h}:${m}:00`;
      });

      result.push({
        employee: { id: emp.id, name: emp.name },
        times,
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
    if (isNaN(ownerId)) {
      res.status(400).json({ message: "Invalid ownerId" });
      return;
    }

    const page = parseInt((req.query.page as string) ?? "0", 10);
    const size = parseInt((req.query.size as string) ?? "10", 10);

    const skip = page * size;

    // Get pets owned by this owner
    const ownerPets = await prisma.pet.findMany({
      where: { ownerId },
      select: { id: true },
    });

    const petIds = ownerPets.map((p) => p.id);

    const [appointments, totalElements] = await Promise.all([
      prisma.appointment.findMany({
        where: { petId: { in: petIds } },
        include: {
          pet: { select: { id: true, name: true, species: true } },
          employee: { select: { id: true, name: true } },
        },
        orderBy: { startDateTime: "desc" },
        skip,
        take: size,
      }),
      prisma.appointment.count({
        where: { petId: { in: petIds } },
      }),
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
    petId,
    employee_id,
    petOfferingNames,
    totalPrice,
    observations,
    startDateTime: startDateTimeStr,
    durationMinutes,
  } = parsed.data;

  const pet = await prisma.pet.findUnique({ where: { id: petId } });
  if (!pet) {
    res.status(404).json({ message: "Pet not found" });
    return;
  }

  const employee = await prisma.employee.findUnique({ where: { id: employee_id } });
  if (!employee) {
    res.status(404).json({ message: "Employee not found" });
    return;
  }

  const startDateTime = new Date(startDateTimeStr);
  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

  const appointment = await prisma.appointment.create({
    data: {
      petId,
      employeeId: employee_id,
      petOfferingNames,
      totalPrice,
      observations: observations ?? null,
      startDateTime,
      endDateTime,
    },
    include: {
      pet: { select: { id: true, name: true, species: true } },
      employee: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(appointment);
});

// ── DELETE /api/appointments/:id ────────────────────────────────────────────
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }

  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ message: "Appointment not found" });
    return;
  }

  await prisma.appointment.delete({ where: { id } });

  res.status(204).send();
});

// ── PUT /api/appointments/:id ────────────────────────────────────────────────
router.put("/:id", async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }

  const parsed = AppointmentUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
    return;
  }

  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ message: "Appointment not found" });
    return;
  }

  const updateData: Record<string, unknown> = {};

  if (parsed.data.petId !== undefined) updateData.petId = parsed.data.petId;
  if (parsed.data.employee_id !== undefined) updateData.employeeId = parsed.data.employee_id;
  if (parsed.data.petOfferingNames !== undefined) updateData.petOfferingNames = parsed.data.petOfferingNames;
  if (parsed.data.totalPrice !== undefined) updateData.totalPrice = parsed.data.totalPrice;
  if (parsed.data.observations !== undefined) updateData.observations = parsed.data.observations;
  if (parsed.data.startDateTime !== undefined) {
    const start = new Date(parsed.data.startDateTime);
    updateData.startDateTime = start;
    if (parsed.data.durationMinutes !== undefined) {
      updateData.endDateTime = new Date(start.getTime() + parsed.data.durationMinutes * 60 * 1000);
    }
  } else if (parsed.data.durationMinutes !== undefined) {
    // Recompute endDateTime from existing startDateTime
    updateData.endDateTime = new Date(
      existing.startDateTime.getTime() + parsed.data.durationMinutes * 60 * 1000
    );
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: updateData,
    include: {
      pet: { select: { id: true, name: true, species: true } },
      employee: { select: { id: true, name: true } },
    },
  });

  res.json(appointment);
});

export default router;
