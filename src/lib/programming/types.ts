import type { MovementPattern, WeeklyDrillSlot } from "@/db/schema";

export type TourId = "onboarding-v1" | "custom-programming-v1";

export interface WeaknessSignal {
  skillId: number;
  signalStrength: number; // 0-1
  reason: string;
}

export interface DraftSession {
  sessionIndex: number; // 0-based position in the draft schedule
  drillId: number;
  skillId: number;
  courseName: string;
  drillTitle: string;
  plannedDate: string; // YYYY-MM-DD
  plannedSlotMinutes: number;
  primaryMovementPatterns: MovementPattern[];
}

export type { WeeklyDrillSlot };
