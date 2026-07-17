// Simulated transit data using an M/M/c queueing approximation
// for rideshare and bus wait times.

export interface TransitOption {
  id: string;
  type: "rideshare" | "bus" | "rail" | "walk";
  label: string;
  waitMinutes: number;
  surgeMultiplier: number | null;
  nearestZoneId: string;
  stepFree: boolean;
}

export interface TransitInfo {
  options: TransitOption[];
  lastUpdatedAt: string;
}

export interface ExitSlot {
  block: string;
  recommendedExitAt: string;
  gateId: string;
  gateName: string;
  estimatedCrowdPct: number;
}

// Simple queueing simulation: arrival rate (lambda) / servers (c) for wait time
function mmcWaitMinutes(lambda: number, mu: number, c: number): number {
  const rho = lambda / (c * mu);
  if (rho >= 1) return 30; // saturated
  const base = 1 / (mu * (1 - rho));
  return Math.round(base * 60 * 10) / 10; // convert hrs to min
}

let lastReset = Date.now();

export function getTransitInfo(): TransitInfo {
  // Simulate fluctuation every minute
  const elapsed = (Date.now() - lastReset) / 60000;
  const demandFactor = 1 + Math.sin(elapsed * 0.5) * 0.3;

  const rideshareWait = Math.round(mmcWaitMinutes(20 * demandFactor, 4, 6) * 10) / 10;
  const busWait = Math.round((8 + Math.random() * 4) * 10) / 10;
  const railWait = Math.round((3 + Math.random() * 2) * 10) / 10;

  const options: TransitOption[] = [
    {
      id: "rideshare-a",
      type: "rideshare",
      label: "Rideshare Pickup Zone A",
      waitMinutes: rideshareWait,
      surgeMultiplier: demandFactor > 1.2 ? Math.round(demandFactor * 10) / 10 : null,
      nearestZoneId: "transit-hub",
      stepFree: true,
    },
    {
      id: "bus-1",
      type: "bus",
      label: "Bus Route 51 (City Centre)",
      waitMinutes: busWait,
      surgeMultiplier: null,
      nearestZoneId: "transit-hub",
      stepFree: true,
    },
    {
      id: "rail-metro",
      type: "rail",
      label: "Metro Line 2 — Southbound",
      waitMinutes: railWait,
      surgeMultiplier: null,
      nearestZoneId: "gate-south",
      stepFree: true,
    },
    {
      id: "walk-north",
      type: "walk",
      label: "Walk — North Parking (10 min)",
      waitMinutes: 0,
      surgeMultiplier: null,
      nearestZoneId: "gate-north",
      stepFree: false,
    },
  ];

  return {
    options,
    lastUpdatedAt: new Date().toISOString(),
  };
}

// Post-match staggered exit plan
export function getExitPlan(): ExitSlot[] {
  const now = new Date();
  // Recommend staggered exits starting from 5 minutes into the future
  const base = now.getTime();

  return [
    {
      block: "Block A (Rows 1–20)",
      recommendedExitAt: new Date(base + 5 * 60000).toISOString(),
      gateId: "gate-north",
      gateName: "North Gate",
      estimatedCrowdPct: 38,
    },
    {
      block: "Block B (Rows 21–40)",
      recommendedExitAt: new Date(base + 10 * 60000).toISOString(),
      gateId: "gate-west",
      gateName: "West Gate",
      estimatedCrowdPct: 45,
    },
    {
      block: "Block C (Rows 41–60)",
      recommendedExitAt: new Date(base + 15 * 60000).toISOString(),
      gateId: "gate-south",
      gateName: "South Gate",
      estimatedCrowdPct: 52,
    },
    {
      block: "Block D (Rows 61–80)",
      recommendedExitAt: new Date(base + 20 * 60000).toISOString(),
      gateId: "gate-east",
      gateName: "East Gate",
      estimatedCrowdPct: 68,
    },
    {
      block: "Block E (Rows 81+)",
      recommendedExitAt: new Date(base + 28 * 60000).toISOString(),
      gateId: "gate-north",
      gateName: "North Gate",
      estimatedCrowdPct: 40,
    },
  ];
}
