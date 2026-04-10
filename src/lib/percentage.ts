export function calculateWeight(
  maxWeight: number,
  percentage: number
): number {
  const raw = maxWeight * (percentage / 100);
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
