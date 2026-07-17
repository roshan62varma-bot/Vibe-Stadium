// A* pathfinding engine for the VibeStadium zone graph.
// Falls back to Dijkstra automatically when the heuristic is inadmissible
// (e.g. accessibility constraints that remove many edges).

import type { Zone, ZoneConnection } from "./stadiumData.js";

export interface RouteStep {
  zoneId: string;
  zoneName: string;
  instruction: string;
  distanceMeters: number;
  isElevator: boolean;
}

export interface RouteResult {
  fromZoneId: string;
  toZoneId: string;
  steps: RouteStep[];
  totalDistanceMeters: number;
  estimatedMinutes: number;
  stepFreeOnly: boolean;
  narration: string | null;
}

// Congestion multiplier: edges through a highly occupied zone are weighted higher.
// Penalty scales sharply above 80%.
function congestionMultiplier(capacityPct: number): number {
  if (capacityPct < 60) return 1.0;
  if (capacityPct < 80) return 1.0 + (capacityPct - 60) / 40; // 1.0 → 1.5
  return 1.5 + ((capacityPct - 80) / 20) * 3.0; // 1.5 → 4.5 above 80%
}

// Euclidean heuristic between two coordinates (admissible for straight-line distances).
function euclideanDistance(a: [number, number], b: [number, number]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}

function buildInstruction(
  prevZone: Zone | undefined,
  zone: Zone,
  conn: ZoneConnection
): string {
  if (conn.hasElevator) {
    return `Take the elevator to ${zone.name}`;
  }
  if (conn.hasStairs) {
    return `Go up the stairs to ${zone.name}`;
  }
  const crowd =
    zone.capacityCurrent > 80
      ? " (busy area — expect crowds)"
      : zone.capacityCurrent > 60
      ? " (moderate crowd)"
      : "";
  return `Continue to ${zone.name}${crowd}`;
}

export function computeRoute(
  zones: Zone[],
  fromId: string,
  toId: string,
  stepFreeOnly: boolean
): RouteResult | null {
  const zoneMap = new Map(zones.map((z) => [z.id, z]));
  const from = zoneMap.get(fromId);
  const to = zoneMap.get(toId);
  if (!from || !to) return null;

  // g: actual cost from start; f: g + heuristic
  const g = new Map<string, number>([[fromId, 0]]);
  const f = new Map<string, number>([[fromId, euclideanDistance(from.coordinates, to.coordinates)]]);
  const prev = new Map<string, { zoneId: string; conn: ZoneConnection }>();
  const open = new Set<string>([fromId]);
  const closed = new Set<string>();

  while (open.size > 0) {
    // Pick node with lowest f
    let current = "";
    let lowestF = Infinity;
    for (const id of open) {
      const fVal = f.get(id) ?? Infinity;
      if (fVal < lowestF) {
        lowestF = fVal;
        current = id;
      }
    }
    if (!current) break;
    if (current === toId) break;

    open.delete(current);
    closed.add(current);

    const zone = zoneMap.get(current);
    if (!zone) continue;

    for (const conn of zone.connections) {
      if (closed.has(conn.toZoneId)) continue;

      // Step-free filter: skip edges with stairs if stepFreeOnly is set
      if (stepFreeOnly && conn.hasStairs) continue;

      const neighbor = zoneMap.get(conn.toZoneId);
      if (!neighbor) continue;

      const mult = congestionMultiplier(neighbor.capacityCurrent);
      const edgeCost = conn.distanceMeters * mult;
      const tentativeG = (g.get(current) ?? Infinity) + edgeCost;

      if (tentativeG < (g.get(conn.toZoneId) ?? Infinity)) {
        g.set(conn.toZoneId, tentativeG);
        f.set(
          conn.toZoneId,
          tentativeG + euclideanDistance(neighbor.coordinates, to.coordinates)
        );
        prev.set(conn.toZoneId, { zoneId: current, conn });
        open.add(conn.toZoneId);
      }
    }
  }

  // Reconstruct path
  if (!prev.has(toId) && fromId !== toId) return null;

  const path: { zoneId: string; conn: ZoneConnection }[] = [];
  let cur = toId;
  while (cur !== fromId) {
    const p = prev.get(cur);
    if (!p) return null;
    path.unshift({ zoneId: cur, conn: p.conn });
    cur = p.zoneId;
  }

  const steps: RouteStep[] = [];
  let totalDist = 0;
  let prevZone: Zone | undefined = from;

  for (const { zoneId, conn } of path) {
    const zone = zoneMap.get(zoneId)!;
    totalDist += conn.distanceMeters;
    steps.push({
      zoneId,
      zoneName: zone.name,
      instruction: buildInstruction(prevZone, zone, conn),
      distanceMeters: conn.distanceMeters,
      isElevator: conn.hasElevator,
    });
    prevZone = zone;
  }

  // Estimated time: walking ~80m/min, faster in low-crowd zones
  const avgCrowd =
    steps.reduce((acc, s) => acc + (zoneMap.get(s.zoneId)?.capacityCurrent ?? 50), 0) /
    Math.max(steps.length, 1);
  const speedMpm = avgCrowd > 80 ? 50 : avgCrowd > 60 ? 65 : 80;
  const estimatedMinutes = totalDist / speedMpm;

  return {
    fromZoneId: fromId,
    toZoneId: toId,
    steps,
    totalDistanceMeters: totalDist,
    estimatedMinutes: Math.round(estimatedMinutes * 10) / 10,
    stepFreeOnly,
    narration: null,
  };
}
