import type { Request, Response } from "express";
import { Router } from "express";
import { NarrateRouteBody } from "@workspace/api-zod";
import { getZones } from "../lib/stadiumData.js";
import { narrate } from "../lib/narrator.js";

const router = Router();

// POST /narrate
router.post("/", (req: Request, res: Response) => {
  const body = NarrateRouteBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid narration request" });
    return;
  }

  const zones = getZones();
  const result = narrate(
    {
      type: body.data.type as "route" | "zone" | "emergency" | "assistant",
      query: body.data.query,
      zoneId: body.data.zoneId,
      routeContext: body.data.routeContext,
      language: body.data.language,
      tone: body.data.tone as "neutral" | "reassuring" | "urgent" | undefined,
    },
    zones
  );

  res.json(result);
});

export default router;
