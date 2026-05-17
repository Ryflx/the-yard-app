import type { MovementPattern, WeeklyDrillSlot } from "@/db/schema";
import type { DraftSession } from "./types";

export const RULES_VERSION = "v0";

const DOW_INDEX: Record<WeeklyDrillSlot["dow"], number> = {
  MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 0,
};

export interface SchedulerDrill {
  id: number;
  courseId: number;
  week: number;
  orderInWeek: number;
  estimatedSessionMinutes: number;
  primaryMovementPatterns: MovementPattern[];
  title: string;
  courseName: string;
}

export interface SchedulerSkillCandidate {
  skillId: number;
  drillsPerWeek: number;
  drills: SchedulerDrill[]; // ordered (week, orderInWeek)
}

export interface ExistingWorkout {
  date: string; // YYYY-MM-DD
  primaryPatterns: readonly MovementPattern[];
}

export interface SchedulerInput {
  startsOn: string; // YYYY-MM-DD
  weeks: number;
  slots: WeeklyDrillSlot[];
  candidates: SchedulerSkillCandidate[];
  existingWorkouts: ExistingWorkout[];
}

export interface SchedulerOutput {
  placements: DraftSession[];
  unplaceable: Array<{ skillId: number; drill: SchedulerDrill }>;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dowOf(iso: string): number {
  return new Date(iso + "T00:00:00Z").getUTCDay();
}

interface CalendarSlot {
  date: string;
  minutes: WeeklyDrillSlot["minutes"];
  consumed: boolean;
}

function buildSlotCalendar(slots: WeeklyDrillSlot[], startsOn: string, weeks: number): CalendarSlot[] {
  const out: CalendarSlot[] = [];
  for (let w = 0; w < weeks; w++) {
    for (const slot of slots) {
      const targetDow = DOW_INDEX[slot.dow];
      const startDow = dowOf(startsOn);
      const offset = (targetDow - startDow + 7) % 7;
      const date = addDays(startsOn, w * 7 + offset);
      out.push({ date, minutes: slot.minutes, consumed: false });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/**
 * Returns true if placing a drill with `patterns` on `date` would conflict with
 * the given list of existing workouts.
 *
 * Rules:
 *   - Two or more workouts already on the same day → true (day is full)
 *   - Same movement pattern on the same day or the previous day → true (recovery)
 */
export function conflictsWithExisting(
  date: string,
  patterns: readonly MovementPattern[],
  existing: readonly ExistingWorkout[]
): boolean {
  const sameDay = existing.filter((w) => w.date === date);
  if (sameDay.length >= 2) return true;
  const prev = addDays(date, -1);
  for (const w of existing) {
    if (w.date !== prev && w.date !== date) continue;
    for (const p of patterns) if (w.primaryPatterns.includes(p)) return true;
  }
  return false;
}

function roundRobin(candidates: SchedulerSkillCandidate[]): Array<{ skillId: number; drill: SchedulerDrill }> {
  const cursors = candidates.map(() => 0);
  const out: Array<{ skillId: number; drill: SchedulerDrill }> = [];
  let added = true;
  while (added) {
    added = false;
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      if (cursors[i] < c.drills.length) {
        out.push({ skillId: c.skillId, drill: c.drills[cursors[i]] });
        cursors[i] += 1;
        added = true;
      }
    }
  }
  return out;
}

export function placeDrills(input: SchedulerInput): SchedulerOutput {
  // TODO(v0.1): drillsPerWeek carried on SchedulerSkillCandidate but currently
  // ignored — all drills go into a flat round-robin queue. Pacing across the
  // 8-week window is undefined for courses with more drills than weeks*pace.
  const calendar = buildSlotCalendar(input.slots, input.startsOn, input.weeks);
  const queue = roundRobin(input.candidates);
  const placements: DraftSession[] = [];
  const unplaceable: SchedulerOutput["unplaceable"] = [];
  // Track drills placed so far in this run for self-adjacency checks
  const placedSoFar: ExistingWorkout[] = [];
  let sessionIndex = 0;

  for (const item of queue) {
    let placed = false;
    for (const slot of calendar) {
      if (slot.consumed) continue;
      if (slot.minutes < item.drill.estimatedSessionMinutes) continue;
      // CUSTOM drills are short (15-60min) additions meant to sit alongside existing classes,
      // not replace days. Allow placement even when day already has 2 class workouts, as long
      // as no same-day pattern conflict (next check below).
      const sameDayExisting = input.existingWorkouts.filter((w) => w.date === slot.date);
      if (sameDayExisting.length >= 3) continue;
      const sameDayPatternClash = sameDayExisting.some((w) =>
        item.drill.primaryMovementPatterns.some((p) => w.primaryPatterns.includes(p))
      );
      if (sameDayPatternClash) continue;
      // Drills placed so far in this run: also enforce 24h adjacency
      if (conflictsWithExisting(slot.date, item.drill.primaryMovementPatterns, placedSoFar)) continue;
      const session: DraftSession = {
        sessionIndex: sessionIndex++,
        drillId: item.drill.id,
        skillId: item.skillId,
        courseName: item.drill.courseName,
        drillTitle: item.drill.title,
        plannedDate: slot.date,
        plannedSlotMinutes: slot.minutes,
        primaryMovementPatterns: item.drill.primaryMovementPatterns,
      };
      placements.push(session);
      placedSoFar.push({ date: slot.date, primaryPatterns: item.drill.primaryMovementPatterns });
      slot.consumed = true;
      placed = true;
      break;
    }
    if (!placed) unplaceable.push({ skillId: item.skillId, drill: item.drill });
  }

  return { placements, unplaceable };
}
