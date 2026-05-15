import type { WodScoreType } from "@/db/schema";
import { findBenchmarkWod } from "./benchmark-wods";
import type { Sex } from "./strength-standards";

// Accepts "m:ss" or plain seconds. Returns 0 on unparseable input. This is
// the canonical parser — benchmark-wods.ts also imports from here so the
// two sites can't drift.
export function parseTimeToSeconds(value: string): number {
  const parts = value.split(":");
  if (parts.length === 2) {
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  }
  return parseInt(parts[0], 10) || 0;
}

// `total` packs rounds and reps into a single sortable number. We use 1e6
// as the multiplier so even pathological partial-round rep counts (>1000)
// can't collide with the next whole round. Threshold comparisons against
// whole-round brackets should use `total` against `threshold * REPS_PER_ROUND_SCALE`.
const REPS_PER_ROUND_SCALE = 1_000_000;

export function parseRoundsReps(value: string): { rounds: number; reps: number; total: number } {
  if (value.includes("+")) {
    const [r, rep] = value.split("+");
    const rounds = parseInt(r, 10) || 0;
    const reps = parseInt(rep, 10) || 0;
    return { rounds, reps, total: rounds * REPS_PER_ROUND_SCALE + reps };
  }
  const rounds = parseInt(value, 10) || 0;
  return { rounds, reps: 0, total: rounds * REPS_PER_ROUND_SCALE };
}

export { REPS_PER_ROUND_SCALE };

export function compareWodScores(a: string, b: string, scoreType: WodScoreType): number {
  if (scoreType === "TIME" || scoreType === "INTERVAL") {
    return parseTimeToSeconds(a) - parseTimeToSeconds(b);
  }
  if (scoreType === "ROUNDS_REPS") {
    return parseRoundsReps(b).total - parseRoundsReps(a).total;
  }
  return parseFloat(b) - parseFloat(a);
}

export function isBetterScore(candidate: string, existing: string, scoreType: WodScoreType): boolean {
  return compareWodScores(candidate, existing, scoreType) < 0;
}

const TIER_POINTS: Record<string, number> = {
  DRAGON: 100,
  BEAST: 70,
  WARRIOR: 40,
  HUNTER: 20,
  ROOKIE: 5,
};

const TIER_THRESHOLDS = [
  { name: "DRAGON", min: 850 },
  { name: "BEAST", min: 600 },
  { name: "WARRIOR", min: 350 },
  { name: "HUNTER", min: 150 },
  { name: "ROOKIE", min: 0 },
];

export function computeCompositeScore(
  tierResults: { wodName: string; tierName: string }[]
): { score: number; overallTier: string; pointsToNextTier: number; nextTier: string | null } {
  if (tierResults.length === 0) {
    return { score: 0, overallTier: "ROOKIE", pointsToNextTier: 150, nextTier: "HUNTER" };
  }

  const totalPoints = tierResults.reduce((sum, r) => sum + (TIER_POINTS[r.tierName] ?? 0), 0);
  const maxPossible = tierResults.length * 100;
  const score = Math.round((totalPoints / maxPossible) * 1000);

  let overallTier = "ROOKIE";
  for (const t of TIER_THRESHOLDS) {
    if (score >= t.min) {
      overallTier = t.name;
      break;
    }
  }

  const currentIdx = TIER_THRESHOLDS.findIndex((t) => t.name === overallTier);
  const nextTier = currentIdx > 0 ? TIER_THRESHOLDS[currentIdx - 1].name : null;
  const pointsToNextTier = nextTier ? TIER_THRESHOLDS[currentIdx - 1].min - score : 0;

  return { score, overallTier, pointsToNextTier, nextTier };
}

export function distanceToNextTier(
  scoreValue: string,
  scoreType: WodScoreType,
  wodName: string,
  sex: Sex,
  currentTierIndex: number
): string | null {
  if (currentTierIndex <= 0) return null;

  const benchmark = findBenchmarkWod(wodName);
  if (!benchmark) return null;

  const brackets = benchmark[sex];
  const tierNames = ["dragon", "beast", "warrior", "hunter"] as const;
  const nextTierKey = tierNames[currentTierIndex - 1];
  if (!nextTierKey) return null;

  const target = brackets[nextTierKey];

  if (scoreType === "TIME" || scoreType === "INTERVAL") {
    const current = parseTimeToSeconds(scoreValue);
    const diff = current - target;
    if (diff <= 0) return null;
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return m > 0 ? `${m}:${String(s).padStart(2, "0")} faster` : `${s}s faster`;
  }

  if (scoreType === "ROUNDS_REPS") {
    const current = parseRoundsReps(scoreValue).total;
    const targetScaled = target * REPS_PER_ROUND_SCALE;
    const diff = targetScaled - current;
    if (diff <= 0) return null;
    const rounds = Math.floor(diff / REPS_PER_ROUND_SCALE);
    const reps = diff % REPS_PER_ROUND_SCALE;
    if (rounds > 0 && reps > 0) return `${rounds} rounds + ${reps} reps more`;
    if (rounds > 0) return `${rounds} more rounds`;
    return `${reps} more reps`;
  }

  return null;
}

export { TIER_POINTS, TIER_THRESHOLDS };
