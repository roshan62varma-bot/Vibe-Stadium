// In-memory bin state with simulated fill drift

export interface Bin {
  id: string;
  zoneId: string;
  zoneName: string;
  capacityPct: number;
  lastEmptiedAt: string;
  reportCount: number;
  predictedOverflow: boolean;
}

let bins: Bin[] = [
  { id: "bin-ne-1", zoneId: "concourse-ne", zoneName: "NE Concourse", capacityPct: 87, lastEmptiedAt: new Date(Date.now() - 3600000).toISOString(), reportCount: 3, predictedOverflow: true },
  { id: "bin-ne-2", zoneId: "concourse-ne", zoneName: "NE Concourse", capacityPct: 54, lastEmptiedAt: new Date(Date.now() - 1800000).toISOString(), reportCount: 0, predictedOverflow: false },
  { id: "bin-nw-1", zoneId: "concourse-nw", zoneName: "NW Concourse", capacityPct: 42, lastEmptiedAt: new Date(Date.now() - 2400000).toISOString(), reportCount: 0, predictedOverflow: false },
  { id: "bin-se-1", zoneId: "concourse-se", zoneName: "SE Concourse", capacityPct: 93, lastEmptiedAt: new Date(Date.now() - 5400000).toISOString(), reportCount: 5, predictedOverflow: true },
  { id: "bin-sw-1", zoneId: "concourse-sw", zoneName: "SW Concourse", capacityPct: 29, lastEmptiedAt: new Date(Date.now() - 900000).toISOString(), reportCount: 0, predictedOverflow: false },
  { id: "bin-amenity-e", zoneId: "amenity-east", zoneName: "Food & Merch East", capacityPct: 71, lastEmptiedAt: new Date(Date.now() - 2700000).toISOString(), reportCount: 1, predictedOverflow: false },
  { id: "bin-amenity-w", zoneId: "amenity-west", zoneName: "Food & Merch West", capacityPct: 38, lastEmptiedAt: new Date(Date.now() - 1200000).toISOString(), reportCount: 0, predictedOverflow: false },
];

// Rate limiting: track reports per device/user in the last 5 minutes
const recentReports = new Map<string, number[]>();

export function getBins(): Bin[] {
  return bins;
}

export function getBinById(id: string): Bin | undefined {
  return bins.find((b) => b.id === id);
}

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = (recentReports.get(userId) ?? []).filter((t) => now - t < 5 * 60000);
  if (timestamps.length >= 3) return true;
  timestamps.push(now);
  recentReports.set(userId, timestamps);
  return false;
}

export interface ReportBinResult {
  success: boolean;
  rateLimited: boolean;
  bin?: Bin;
  creditsAwarded: number;
}

export function reportBin(binId: string, userId: string): ReportBinResult {
  if (isRateLimited(userId)) {
    return { success: false, rateLimited: true, creditsAwarded: 0 };
  }

  const idx = bins.findIndex((b) => b.id === binId);
  if (idx === -1) return { success: false, rateLimited: false, creditsAwarded: 0 };

  bins[idx] = {
    ...bins[idx]!,
    capacityPct: Math.min(100, bins[idx]!.capacityPct + 5),
    reportCount: bins[idx]!.reportCount + 1,
    predictedOverflow: bins[idx]!.capacityPct + 5 >= 90,
  };

  const creditsAwarded = 10; // idempotent, fixed per report
  return { success: true, rateLimited: false, bin: bins[idx]!, creditsAwarded };
}
