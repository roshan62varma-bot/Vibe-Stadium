import type { Request, Response } from "express";
import { Router } from "express";
import { GetRouteQueryParams } from "@workspace/api-zod";
import { getZones } from "../lib/stadiumData.js";
import { computeRoute } from "../lib/pathfinding.js";
import { narrateRoute } from "../lib/narrator.js";

const router = Router();

// GET /route?from=&to=&stepFreeOnly=
router.get("/", (req: Request, res: Response) => {
  const query = GetRouteQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Missing required params: from, to" });
    return;
  }

  const { from, to } = query.data;
  const stepFreeOnly = req.query.stepFreeOnly === 'true';
  const zones = getZones();
  const result = computeRoute(zones, from, to, stepFreeOnly);

  if (!result) {
    res.status(400).json({ error: `No route found from ${from} to ${to}` });
    return;
  }

  // Attach AI narration
  const narrationResult = narrateRoute(result, zones);
  result.narration = narrationResult.text;

  res.json(result);
});

export default router;
