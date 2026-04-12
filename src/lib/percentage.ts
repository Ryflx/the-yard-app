export function calculateWeight(
  maxWeight: number,
  percentage: number
): number {
  const raw = maxWeight * (percentage / 100);
  return Math.round(raw * 2) / 2;
}

export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  const raw = weight * (1 + reps / 30);
  return Math.round(raw * 2) / 2;
}

export function formatWeight(weight: number, unit: string = "kg"): string {
  const display = weight % 1 === 0 ? weight.toString() : weight.toFixed(1);
  return `${display}${unit}`;
}

const LIFT_ALIASES: Record<string, string[]> = {
  "squat snatch": ["snatch", "squat snatch", "full snatch"],
  "squat clean": ["clean", "squat clean", "full clean"],
  "squat clean + split jerk": [
    "clean and jerk",
    "clean + jerk",
    "squat clean + split jerk",
    "clean & jerk",
  ],
  "snatch pull + hang squat snatch": [
    "snatch pull + hang squat snatch",
    "hang snatch",
    "hang squat snatch",
  ],
  "power clean + hang squat clean": [
    "power clean + hang squat clean",
    "power clean",
    "hang clean",
  ],
  "bench press": [
    "bench press",
    "swiss bar bench press",
    "swiss bench press",
    "dumbbell bench press",
    "flat bench press",
  ],
  "deadlift": [
    "deadlift",
    "sumo deadlift",
    "hybrid deadlift",
    "sumo or hybrid deadlift",
    "3 sumo or hybrid deadlift",
    "conventional deadlift",
  ],
  "back squat": ["back squat"],
  "front squat": ["front squat"],
};

export function normalizeLiftName(name: string): string {
  const lower = name.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(LIFT_ALIASES)) {
    if (aliases.includes(lower) || canonical === lower) {
      return canonical;
    }
  }
  return lower;
}
