import { describe, it, expect } from "vitest";
import { computeRoute } from "../artifacts/api-server/src/lib/pathfinding.ts";
import type { Zone } from "../artifacts/api-server/src/lib/stadiumData.ts";

const createMockZones = (bCapacity: number): Zone[] => [
  {
    id: "zone-a",
    name: "Zone A",
    type: "gate",
    capacityMax: 100,
    capacityCurrent: 10,
    coordinates: [0, 0],
    connections: [
      { toZoneId: "zone-b", distanceMeters: 50, hasStairs: false, hasElevator: false },
      { toZoneId: "zone-d", distanceMeters: 80, hasStairs: false, hasElevator: false },
    ],
    accessibility: { stepFree: true, elevatorNearby: false },
    trendingDirection: "stable",
    predictedPct: null,
  },
  {
    id: "zone-b",
    name: "Zone B",
    type: "concourse",
    capacityMax: 100,
    capacityCurrent: bCapacity,
    coordinates: [50, 0],
    connections: [
      { toZoneId: "zone-c", distanceMeters: 50, hasStairs: false, hasElevator: false },
    ],
    accessibility: { stepFree: true, elevatorNearby: false },
    trendingDirection: "stable",
    predictedPct: null,
  },
  {
    id: "zone-d",
    name: "Zone D",
    type: "concourse",
    capacityMax: 100,
    capacityCurrent: 10,
    coordinates: [40, 40],
    connections: [
      { toZoneId: "zone-c", distanceMeters: 50, hasStairs: false, hasElevator: false },
    ],
    accessibility: { stepFree: true, elevatorNearby: false },
    trendingDirection: "stable",
    predictedPct: null,
  },
  {
    id: "zone-c",
    name: "Zone C",
    type: "seating",
    capacityMax: 100,
    capacityCurrent: 10,
    coordinates: [100, 0],
    connections: [],
    accessibility: { stepFree: true, elevatorNearby: false },
    trendingDirection: "stable",
    predictedPct: null,
  },
];

describe("A* Pathfinding Detour Engine Tests", () => {
  it("should choose the direct path B when capacity of B is low (10%)", () => {
    const zones = createMockZones(10);
    const result = computeRoute(zones, "zone-a", "zone-c", false);
    expect(result).not.toBeNull();
    const pathIds = result!.steps.map(s => s.zoneId);
    expect(pathIds).toEqual(["zone-b", "zone-c"]);
  });

  it("should choose the detour path D when B is congested (>80% capacity)", () => {
    const zones = createMockZones(90);
    const result = computeRoute(zones, "zone-a", "zone-c", false);
    expect(result).not.toBeNull();
    const pathIds = result!.steps.map(s => s.zoneId);
    expect(pathIds).toEqual(["zone-d", "zone-c"]);
  });

  it("should handle empty or invalid starting/ending zone IDs by returning null instead of throwing", () => {
    const zones = createMockZones(10);
    const res1 = computeRoute(zones, "", "zone-c", false);
    expect(res1).toBeNull();
    
    const res2 = computeRoute(zones, "zone-a", "", false);
    expect(res2).toBeNull();

    const res3 = computeRoute(zones, "invalid-zone-1", "invalid-zone-2", false);
    expect(res3).toBeNull();

    const res4 = computeRoute(zones, "a".repeat(1000), "b".repeat(1000), false);
    expect(res4).toBeNull();
  });

  it("should handle completely empty zone graphs gracefully", () => {
    const res = computeRoute([], "zone-a", "zone-c", false);
    expect(res).toBeNull();
  });
});
