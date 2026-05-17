import { describe, it, expect } from "vitest";
import { placeDrills, conflictsWithExisting, type SchedulerInput } from "./scheduler";
import type { WeeklyDrillSlot } from "@/db/schema";

const baseSlot = (dow: WeeklyDrillSlot["dow"], minutes: WeeklyDrillSlot["minutes"] = 30): WeeklyDrillSlot => ({
  dow,
  when: "after_class",
  minutes,
});

const drill = (id: number, courseId: number, week: number, order: number, mins: number, patterns: ("pull" | "press")[] = []) => ({
  id,
  courseId,
  week,
  orderInWeek: order,
  estimatedSessionMinutes: mins,
  primaryMovementPatterns: patterns,
  title: `drill-${id}`,
  courseName: `course-${courseId}`,
});

describe("conflictsWithExisting", () => {
  it("returns true when 2+ workouts already on the day", () => {
    const existing = [
      { date: "2026-05-19", primaryPatterns: [] },
      { date: "2026-05-19", primaryPatterns: [] },
    ];
    expect(conflictsWithExisting("2026-05-19", ["pull"], existing)).toBe(true);
  });

  it("returns true when same pattern within 24h", () => {
    const existing = [{ date: "2026-05-18", primaryPatterns: ["pull"] as const }];
    expect(conflictsWithExisting("2026-05-19", ["pull"], existing)).toBe(true);
  });

  it("returns false when no overlap and only 1 existing", () => {
    const existing = [{ date: "2026-05-19", primaryPatterns: ["squat"] as const }];
    expect(conflictsWithExisting("2026-05-19", ["pull"], existing)).toBe(false);
  });
});

describe("placeDrills", () => {
  it("places drills round-robin across selected skills", () => {
    const input: SchedulerInput = {
      startsOn: "2026-05-18", // Mon
      weeks: 1,
      slots: [baseSlot("TUE"), baseSlot("WED"), baseSlot("THU"), baseSlot("FRI")],
      candidates: [
        { skillId: 10, drillsPerWeek: 2, drills: [drill(1, 10, 1, 1, 25), drill(2, 10, 1, 2, 25)] },
        { skillId: 11, drillsPerWeek: 2, drills: [drill(3, 11, 1, 1, 25), drill(4, 11, 1, 2, 25)] },
      ],
      existingWorkouts: [],
    };
    const { placements, unplaceable } = placeDrills(input);
    expect(unplaceable).toHaveLength(0);
    expect(placements.map((p) => p.skillId)).toEqual([10, 11, 10, 11]);
  });

  it("skips a slot when the drill is longer than slot minutes", () => {
    const input: SchedulerInput = {
      startsOn: "2026-05-18",
      weeks: 1,
      slots: [baseSlot("TUE", 15), baseSlot("WED", 45)],
      candidates: [{ skillId: 10, drillsPerWeek: 1, drills: [drill(1, 10, 1, 1, 30)] }],
      existingWorkouts: [],
    };
    const { placements } = placeDrills(input);
    expect(placements).toHaveLength(1);
    expect(placements[0].plannedDate).toBe("2026-05-20"); // WED, not TUE
  });

  it("reports unplaceable drills when slots run out", () => {
    const input: SchedulerInput = {
      startsOn: "2026-05-18",
      weeks: 1,
      slots: [baseSlot("TUE")],
      candidates: [
        { skillId: 10, drillsPerWeek: 1, drills: [drill(1, 10, 1, 1, 25), drill(2, 10, 1, 2, 25)] },
      ],
      existingWorkouts: [],
    };
    const { placements, unplaceable } = placeDrills(input);
    expect(placements).toHaveLength(1);
    expect(unplaceable).toHaveLength(1);
    expect(unplaceable[0].drill.id).toBe(2);
  });

  it("respects existing workouts with conflicting patterns", () => {
    const input: SchedulerInput = {
      startsOn: "2026-05-18",
      weeks: 1,
      slots: [baseSlot("TUE"), baseSlot("WED")],
      candidates: [
        { skillId: 10, drillsPerWeek: 1, drills: [drill(1, 10, 1, 1, 25, ["pull"])] },
      ],
      existingWorkouts: [{ date: "2026-05-19", primaryPatterns: ["pull"] }], // TUE — should push to WED
    };
    const { placements } = placeDrills(input);
    expect(placements[0].plannedDate).toBe("2026-05-20");
  });
});
