import type { Request, Response } from "express";
import { Router } from "express";
import {
  GetZoneParams,
  OverrideZoneCapacityParams,
  OverrideZoneCapacityBody,
} from "@workspace/api-zod";
import { getZones, getZoneById, setZoneCapacity } from "../lib/stadiumData.js";

const router = Router();

// GET /zones
router.get("/", (_req: Request, res: Response) => {
  res.json(getZones());
});

// GET /zones/:zoneId
router.get("/:zoneId", (req: Request, res: Response) => {
  const params = GetZoneParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid zone ID" });
    return;
  }
  const zone = getZoneById(params.data.zoneId);
  if (!zone) {
    res.status(404).json({ error: "Zone not found" });
    return;
  }
  res.json(zone);
});

// PATCH /zones/:zoneId/capacity  (Ops Console override)
router.patch("/:zoneId/capacity", (req: Request, res: Response) => {
  const params = OverrideZoneCapacityParams.safeParse(req.params);
  const body = OverrideZoneCapacityBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const updated = setZoneCapacity(params.data.zoneId, body.data.capacityCurrent);
  if (!updated) {
    res.status(404).json({ error: "Zone not found" });
    return;
  }
  res.json(updated);
});

export default router;
