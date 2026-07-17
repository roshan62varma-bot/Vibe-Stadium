import type { Request, Response } from "express";
import { Router } from "express";
import { getTransitInfo, getExitPlan } from "../lib/transitData.js";

const router = Router();

// GET /transit
router.get("/", (_req: Request, res: Response) => {
  res.json(getTransitInfo());
});

// GET /transit/exit-plan
router.get("/exit-plan", (_req: Request, res: Response) => {
  res.json(getExitPlan());
});

export default router;
