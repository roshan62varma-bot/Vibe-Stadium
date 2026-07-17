import type { Request, Response } from "express";
import { Router } from "express";
import { GetDensityHistoryQueryParams } from "@workspace/api-zod";
import { getZones } from "../lib/stadiumData.js";
import { getBins } from "../lib/binsData.js";

const router = Router();

// GET /stats
router.get("/", (_req: Request, res: Response) => {
  const zones = getZones();
  const bins = getBins();

  const bottleneckZones = zones.filter((z) => z.capacityCurrent >= 80).length;
  const binsNearFull = bins.filter((b) => b.capacityPct >= 80).length;
  const totalCapacityPct =
    zones.reduce((acc, z) => acc + z.capacityCurrent, 0) / zones.length;

  const activeAlerts = zones.filter(
    (z) => z.capacityCurrent >= 80 || (z.predictedPct != null && z.predictedPct >= 85)
  ).length;

  const topBottleneck = zones.reduce(
    (top, z) => (z.capacityCurrent > top.capacityCurrent ? z : top),
    zones[0]!
  );

  res.json({
    totalCapacityPct: Math.round(totalCapacityPct * 10) / 10,
    bottleneckZones,
    binsNearFull,
    activeAlerts,
    avgDwellTimeMinutes: 8.4, // simulated KPI
    stepFreeAdoptionPct: 23.7, // simulated KPI
    emergencyResponseTimeSec: 11.2, // simulated KPI
    topBottleneck,
  });
});

// GET /stats/alerts
router.get("/alerts", (_req: Request, res: Response) => {
  const zones = getZones();
  const now = new Date().toISOString();

  const alerts = zones
    .filter((z) => z.capacityCurrent >= 75 || (z.predictedPct != null && z.predictedPct >= 85))
    .map((z) => {
      const severity =
        z.capacityCurrent >= 90 ? "critical" : z.capacityCurrent >= 80 ? "warning" : "info";
      const predicted = z.predictedPct;
      return {
        id: `alert-${z.id}`,
        zoneId: z.id,
        zoneName: z.name,
        message:
          predicted != null && predicted >= 85
            ? `${z.name} is trending toward ${Math.round(predicted)}% capacity in ~6 min based on current inflow`
            : `${z.name} is at ${Math.round(z.capacityCurrent)}% — approaching capacity`,
        severity,
        predictedPct: predicted ?? z.capacityCurrent,
        predictedInMinutes: 6,
        createdAt: now,
      };
    });

  res.json(alerts);
});

// GET /stats/density-history?zoneId=
router.get("/density-history", (req: Request, res: Response) => {
  const query = GetDensityHistoryQueryParams.safeParse(req.query);
  const targetZoneId = query.success ? query.data.zoneId : undefined;

  const zones = getZones();
  const filtered = targetZoneId
    ? zones.filter((z) => z.id === targetZoneId)
    : zones;

  // Generate synthetic 30-minute history (5-minute intervals, 6 points)
  const now = Date.now();
  const samples = filtered.flatMap((z) => {
    return Array.from({ length: 6 }, (_, i) => {
      const offset = (5 - i) * 5 * 60000;
      const jitter = (Math.random() - 0.5) * 10;
      return {
        zoneId: z.id,
        timestamp: new Date(now - offset).toISOString(),
        capacityPct: Math.min(100, Math.max(0, z.capacityCurrent + jitter)),
      };
    });
  });

  res.json(samples);
});

export default router;
