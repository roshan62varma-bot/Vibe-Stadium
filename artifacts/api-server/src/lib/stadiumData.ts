// Stadium zone graph — "Vibe Arena"
// In-memory simulation of live zone density with drift over time

export interface ZoneConnection {
  toZoneId: string;
  distanceMeters: number;
  hasStairs: boolean;
  hasElevator: boolean;
}

export interface Zone {
  id: string;
  name: string;
  type: "gate" | "concourse" | "seating" | "amenity" | "medical" | "transit";
  capacityMax: number;
  capacityCurrent: number; // 0–100
  coordinates: [number, number];
  connections: ZoneConnection[];
  accessibility: { stepFree: boolean; elevatorNearby: boolean };
  trendingDirection: "rising" | "falling" | "stable";
  predictedPct: number | null;
}

const BASE_ZONES: Zone[] = [
  {
    id: "gate-north",
    name: "North Gate",
    type: "gate",
    capacityMax: 2000,
    capacityCurrent: 72,
    coordinates: [400, 60],
    connections: [
      { toZoneId: "concourse-ne", distanceMeters: 80, hasStairs: false, hasElevator: true },
      { toZoneId: "concourse-nw", distanceMeters: 80, hasStairs: false, hasElevator: true },
    ],
    accessibility: { stepFree: true, elevatorNearby: true },
    trendingDirection: "rising",
    predictedPct: 81,
  },
  {
    id: "gate-south",
    name: "South Gate",
    type: "gate",
    capacityMax: 2000,
    capacityCurrent: 45,
    coordinates: [400, 560],
    connections: [
      { toZoneId: "concourse-se", distanceMeters: 80, hasStairs: false, hasElevator: true },
      { toZoneId: "concourse-sw", distanceMeters: 80, hasStairs: false, hasElevator: true },
    ],
    accessibility: { stepFree: true, elevatorNearby: true },
    trendingDirection: "stable",
    predictedPct: 47,
  },
  {
    id: "gate-east",
    name: "East Gate",
    type: "gate",
    capacityMax: 1500,
    capacityCurrent: 88,
    coordinates: [720, 310],
    connections: [
      { toZoneId: "concourse-ne", distanceMeters: 100, hasStairs: true, hasElevator: false },
      { toZoneId: "concourse-se", distanceMeters: 100, hasStairs: true, hasElevator: false },
    ],
    accessibility: { stepFree: false, elevatorNearby: false },
    trendingDirection: "rising",
    predictedPct: 95,
  },
  {
    id: "gate-west",
    name: "West Gate",
    type: "gate",
    capacityMax: 1500,
    capacityCurrent: 38,
    coordinates: [80, 310],
    connections: [
      { toZoneId: "concourse-nw", distanceMeters: 100, hasStairs: false, hasElevator: false },
      { toZoneId: "concourse-sw", distanceMeters: 100, hasStairs: false, hasElevator: false },
    ],
    accessibility: { stepFree: true, elevatorNearby: false },
    trendingDirection: "falling",
    predictedPct: 32,
  },
  {
    id: "concourse-ne",
    name: "NE Concourse",
    type: "concourse",
    capacityMax: 3000,
    capacityCurrent: 83,
    coordinates: [580, 160],
    connections: [
      { toZoneId: "gate-north", distanceMeters: 80, hasStairs: false, hasElevator: true },
      { toZoneId: "gate-east", distanceMeters: 100, hasStairs: true, hasElevator: false },
      { toZoneId: "seating-north", distanceMeters: 120, hasStairs: true, hasElevator: false },
      { toZoneId: "amenity-east", distanceMeters: 60, hasStairs: false, hasElevator: false },
    ],
    accessibility: { stepFree: false, elevatorNearby: true },
    trendingDirection: "rising",
    predictedPct: 90,
  },
  {
    id: "concourse-nw",
    name: "NW Concourse",
    type: "concourse",
    capacityMax: 3000,
    capacityCurrent: 55,
    coordinates: [220, 160],
    connections: [
      { toZoneId: "gate-north", distanceMeters: 80, hasStairs: false, hasElevator: true },
      { toZoneId: "gate-west", distanceMeters: 100, hasStairs: false, hasElevator: false },
      { toZoneId: "seating-north", distanceMeters: 120, hasStairs: true, hasElevator: false },
      { toZoneId: "medical-zone", distanceMeters: 90, hasStairs: false, hasElevator: true },
    ],
    accessibility: { stepFree: true, elevatorNearby: true },
    trendingDirection: "stable",
    predictedPct: 57,
  },
  {
    id: "concourse-se",
    name: "SE Concourse",
    type: "concourse",
    capacityMax: 3000,
    capacityCurrent: 62,
    coordinates: [580, 460],
    connections: [
      { toZoneId: "gate-south", distanceMeters: 80, hasStairs: false, hasElevator: true },
      { toZoneId: "gate-east", distanceMeters: 100, hasStairs: true, hasElevator: false },
      { toZoneId: "seating-south", distanceMeters: 120, hasStairs: true, hasElevator: false },
      { toZoneId: "transit-hub", distanceMeters: 150, hasStairs: false, hasElevator: true },
    ],
    accessibility: { stepFree: true, elevatorNearby: true },
    trendingDirection: "stable",
    predictedPct: 64,
  },
  {
    id: "concourse-sw",
    name: "SW Concourse",
    type: "concourse",
    capacityMax: 3000,
    capacityCurrent: 41,
    coordinates: [220, 460],
    connections: [
      { toZoneId: "gate-south", distanceMeters: 80, hasStairs: false, hasElevator: true },
      { toZoneId: "gate-west", distanceMeters: 100, hasStairs: false, hasElevator: false },
      { toZoneId: "seating-south", distanceMeters: 120, hasStairs: true, hasElevator: false },
      { toZoneId: "amenity-west", distanceMeters: 60, hasStairs: false, hasElevator: false },
    ],
    accessibility: { stepFree: false, elevatorNearby: true },
    trendingDirection: "falling",
    predictedPct: 38,
  },
  {
    id: "seating-north",
    name: "North Stand",
    type: "seating",
    capacityMax: 8000,
    capacityCurrent: 91,
    coordinates: [400, 200],
    connections: [
      { toZoneId: "concourse-ne", distanceMeters: 120, hasStairs: true, hasElevator: false },
      { toZoneId: "concourse-nw", distanceMeters: 120, hasStairs: true, hasElevator: false },
    ],
    accessibility: { stepFree: false, elevatorNearby: false },
    trendingDirection: "rising",
    predictedPct: 96,
  },
  {
    id: "seating-south",
    name: "South Stand",
    type: "seating",
    capacityMax: 8000,
    capacityCurrent: 77,
    coordinates: [400, 420],
    connections: [
      { toZoneId: "concourse-se", distanceMeters: 120, hasStairs: true, hasElevator: false },
      { toZoneId: "concourse-sw", distanceMeters: 120, hasStairs: true, hasElevator: false },
    ],
    accessibility: { stepFree: false, elevatorNearby: false },
    trendingDirection: "stable",
    predictedPct: 79,
  },
  {
    id: "medical-zone",
    name: "Medical Center",
    type: "medical",
    capacityMax: 100,
    capacityCurrent: 12,
    coordinates: [220, 310],
    connections: [
      { toZoneId: "concourse-nw", distanceMeters: 90, hasStairs: false, hasElevator: true },
      { toZoneId: "concourse-sw", distanceMeters: 90, hasStairs: false, hasElevator: true },
    ],
    accessibility: { stepFree: true, elevatorNearby: true },
    trendingDirection: "stable",
    predictedPct: 12,
  },
  {
    id: "transit-hub",
    name: "Transit Hub",
    type: "transit",
    capacityMax: 500,
    capacityCurrent: 54,
    coordinates: [650, 500],
    connections: [
      { toZoneId: "concourse-se", distanceMeters: 150, hasStairs: false, hasElevator: true },
    ],
    accessibility: { stepFree: true, elevatorNearby: true },
    trendingDirection: "stable",
    predictedPct: 56,
  },
  {
    id: "amenity-east",
    name: "Food & Merch East",
    type: "amenity",
    capacityMax: 500,
    capacityCurrent: 68,
    coordinates: [640, 200],
    connections: [
      { toZoneId: "concourse-ne", distanceMeters: 60, hasStairs: false, hasElevator: false },
    ],
    accessibility: { stepFree: true, elevatorNearby: false },
    trendingDirection: "rising",
    predictedPct: 74,
  },
  {
    id: "amenity-west",
    name: "Food & Merch West",
    type: "amenity",
    capacityMax: 500,
    capacityCurrent: 33,
    coordinates: [160, 420],
    connections: [
      { toZoneId: "concourse-sw", distanceMeters: 60, hasStairs: false, hasElevator: false },
    ],
    accessibility: { stepFree: true, elevatorNearby: false },
    trendingDirection: "falling",
    predictedPct: 29,
  },
];

// In-memory mutable state
let zones: Zone[] = BASE_ZONES.map((z) => ({ ...z }));

// Drift simulation: slightly randomize capacityCurrent every 8 seconds
let driftInterval: ReturnType<typeof setInterval> | null = null;

function drift(val: number, min: number, max: number): number {
  const delta = (Math.random() - 0.5) * 4;
  return Math.min(max, Math.max(min, val + delta));
}

export function startDrift(): void {
  if (driftInterval) return;
  driftInterval = setInterval(() => {
    zones = zones.map((z) => {
      const prev = z.capacityCurrent;
      const next = drift(prev, 5, 99);
      return {
        ...z,
        capacityCurrent: Math.round(next * 10) / 10,
        trendingDirection:
          next > prev + 1 ? "rising" : next < prev - 1 ? "falling" : "stable",
        predictedPct:
          next > 75
            ? Math.min(99, Math.round((next + Math.random() * 8) * 10) / 10)
            : null,
      };
    });
  }, 8000);
}

export function getZones(): Zone[] {
  return zones;
}

export function getZoneById(id: string): Zone | undefined {
  return zones.find((z) => z.id === id);
}

export function setZoneCapacity(id: string, capacityCurrent: number): Zone | undefined {
  const idx = zones.findIndex((z) => z.id === id);
  if (idx === -1) return undefined;
  zones[idx] = { ...zones[idx]!, capacityCurrent };
  return zones[idx];
}
