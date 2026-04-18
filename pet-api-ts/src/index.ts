import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

import ownersRouter from "./routes/owners";
import petsRouter from "./routes/pets";
import petOfferingsRouter from "./routes/petOfferings";
import appointmentsRouter from "./routes/appointments";

const app = express();
const PORT = process.env.PORT ?? 8080;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/owners", ownersRouter);
app.use("/api/pets", petsRouter);
app.use("/api/pet-offerings", petOfferingsRouter);
app.use("/api/appointments", appointmentsRouter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Cuddle API running on http://localhost:${PORT}`);
});

export default app;
