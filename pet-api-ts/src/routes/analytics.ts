import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();

const ANALYTICS_URL = process.env.ANALYTICS_URL ?? "http://localhost:8000";

// Admin-only: analytics should only be available to owners with isAdm=true
router.use(authenticate);
router.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ownerId = req.user?.id;
    if (!ownerId) return res.status(401).json({ message: "Unauthorized" });

    const owner = await prisma.owner.findUnique({
      where: { id: ownerId },
      select: { isAdm: true },
    });

    if (!owner?.isAdm) return res.status(403).json({ message: "Admin only" });
    return next();
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
});

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 30_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

router.get("/districts", async (_req: Request, res: Response) => {
  try {
    const upstream = await fetchWithTimeout(`${ANALYTICS_URL}/districts`);
    const bodyText = await upstream.text();

    if (!upstream.ok) {
      return res.status(upstream.status).json({ message: bodyText || "Analytics service error" });
    }

    // Upstream returns JSON; forward as-is
    return res.status(200).type("application/json").send(bodyText);
  } catch (e: any) {
    const message = e?.name === "AbortError" ? "Analytics service timeout" : "Analytics service unavailable";
    return res.status(502).json({ message });
  }
});

router.get("/dashboard", async (req: Request, res: Response) => {
  const region = (req.query.region as string | undefined)?.trim();
  if (!region) return res.status(400).json({ message: "Missing query param: region" });

  try {
    const url = `${ANALYTICS_URL}/dashboard?region=${encodeURIComponent(region)}`;
    const upstream = await fetchWithTimeout(url, {}, 60_000);
    const bodyText = await upstream.text();

    if (!upstream.ok) {
      return res.status(upstream.status).json({ message: bodyText || "Analytics service error" });
    }

    return res.status(200).type("application/json").send(bodyText);
  } catch (e: any) {
    const message = e?.name === "AbortError" ? "Analytics service timeout" : "Analytics service unavailable";
    return res.status(502).json({ message });
  }
});

export default router;
