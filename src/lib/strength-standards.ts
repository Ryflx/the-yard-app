export type Sex = "male" | "female";

export type StandardLift =
  | "Snatch"
  | "Clean & Jerk"
  | "Back Squat"
  | "Front Squat"
  | "Total";

export interface LevelEntry {
  bodyweight: number;
  total: number;
  snatch: number;
  cleanAndJerk: number;
  backSquat: number;
  frontSquat: number;
}

export interface LevelData {
  level: number;
  label: string;
  description: string;
  men: LevelEntry[];
  women: LevelEntry[];
}

const LEVEL_DESCRIPTIONS: Record<number, { label: string; description: string }> = {
  1: { label: "BEGINNER", description: "Recently started weightlifting, developing technically and physically" },
  2: { label: "INTERMEDIATE", description: "Some training experience, refining technique and building strength" },
  3: { label: "ADVANCED", description: "Advanced intermediate, bordering on US national level competition" },
  4: { label: "NATIONAL", description: "Lower tier US national level, technically proficient and strong" },
  5: { label: "ELITE", description: "Top of US national level, competing at lower international level" },
  6: { label: "EXCEPTIONAL", description: "Consistent optimal technique and exceptional strength levels" },
  7: { label: "WORLD CLASS", description: "The absolute best of the sport in all aspects" },
};

// Source: Catalyst Athletics Weightlifting Levels 2018. All figures in kg.
const STANDARDS: LevelData[] = [
  {
    level: 1, ...LEVEL_DESCRIPTIONS[1],
    men: [
      { bodyweight: 55, total: 105, snatch: 47, cleanAndJerk: 58, backSquat: 74, frontSquat: 63 },
      { bodyweight: 61, total: 116, snatch: 52, cleanAndJerk: 65, backSquat: 81, frontSquat: 70 },
      { bodyweight: 67, total: 123, snatch: 55, cleanAndJerk: 68, backSquat: 86, frontSquat: 74 },
      { bodyweight: 73, total: 129, snatch: 58, cleanAndJerk: 71, backSquat: 90, frontSquat: 77 },
      { bodyweight: 81, total: 136, snatch: 61, cleanAndJerk: 75, backSquat: 95, frontSquat: 82 },
      { bodyweight: 89, total: 145, snatch: 65, cleanAndJerk: 80, backSquat: 102, frontSquat: 87 },
      { bodyweight: 96, total: 152, snatch: 68, cleanAndJerk: 84, backSquat: 103, frontSquat: 63 },
      { bodyweight: 102, total: 157, snatch: 71, cleanAndJerk: 86, backSquat: 110, frontSquat: 94 },
      { bodyweight: 109, total: 162, snatch: 73, cleanAndJerk: 89, backSquat: 113, frontSquat: 97 },
      { bodyweight: 110, total: 167, snatch: 75, cleanAndJerk: 92, backSquat: 117, frontSquat: 100 },
    ],
    women: [
      { bodyweight: 45, total: 65, snatch: 29, cleanAndJerk: 36, backSquat: 46, frontSquat: 39 },
      { bodyweight: 49, total: 70, snatch: 32, cleanAndJerk: 39, backSquat: 49, frontSquat: 42 },
      { bodyweight: 55, total: 81, snatch: 36, cleanAndJerk: 45, backSquat: 57, frontSquat: 49 },
      { bodyweight: 59, total: 86, snatch: 39, cleanAndJerk: 47, backSquat: 60, frontSquat: 52 },
      { bodyweight: 64, total: 90, snatch: 41, cleanAndJerk: 50, backSquat: 63, frontSquat: 54 },
      { bodyweight: 71, total: 97, snatch: 44, cleanAndJerk: 53, backSquat: 68, frontSquat: 58 },
      { bodyweight: 76, total: 101, snatch: 45, cleanAndJerk: 56, backSquat: 71, frontSquat: 61 },
      { bodyweight: 81, total: 108, snatch: 49, cleanAndJerk: 59, backSquat: 76, frontSquat: 65 },
      { bodyweight: 87, total: 116, snatch: 52, cleanAndJerk: 64, backSquat: 81, frontSquat: 70 },
      { bodyweight: 88, total: 120, snatch: 54, cleanAndJerk: 66, backSquat: 74, frontSquat: 72 },
    ],
  },
  {
    level: 2, ...LEVEL_DESCRIPTIONS[2],
    men: [
      { bodyweight: 55, total: 140, snatch: 63, cleanAndJerk: 77, backSquat: 98, frontSquat: 84 },
      { bodyweight: 61, total: 155, snatch: 70, cleanAndJerk: 85, backSquat: 109, frontSquat: 93 },
      { bodyweight: 67, total: 162, snatch: 73, cleanAndJerk: 89, backSquat: 113, frontSquat: 97 },
      { bodyweight: 73, total: 169, snatch: 76, cleanAndJerk: 93, backSquat: 118, frontSquat: 101 },
      { bodyweight: 81, total: 181, snatch: 81, cleanAndJerk: 100, backSquat: 127, frontSquat: 109 },
      { bodyweight: 89, total: 195, snatch: 88, cleanAndJerk: 107, backSquat: 138, frontSquat: 117 },
      { bodyweight: 96, total: 202, snatch: 91, cleanAndJerk: 111, backSquat: 141, frontSquat: 121 },
      { bodyweight: 102, total: 208, snatch: 94, cleanAndJerk: 114, backSquat: 146, frontSquat: 125 },
      { bodyweight: 109, total: 213, snatch: 96, cleanAndJerk: 117, backSquat: 149, frontSquat: 128 },
      { bodyweight: 110, total: 221, snatch: 99, cleanAndJerk: 122, backSquat: 155, frontSquat: 133 },
    ],
    women: [
      { bodyweight: 45, total: 85, snatch: 38, cleanAndJerk: 47, backSquat: 60, frontSquat: 51 },
      { bodyweight: 49, total: 93, snatch: 42, cleanAndJerk: 51, backSquat: 65, frontSquat: 56 },
      { bodyweight: 55, total: 109, snatch: 49, cleanAndJerk: 60, backSquat: 76, frontSquat: 65 },
      { bodyweight: 59, total: 114, snatch: 51, cleanAndJerk: 63, backSquat: 80, frontSquat: 68 },
      { bodyweight: 64, total: 120, snatch: 54, cleanAndJerk: 66, backSquat: 84, frontSquat: 72 },
      { bodyweight: 71, total: 131, snatch: 59, cleanAndJerk: 72, backSquat: 92, frontSquat: 79 },
      { bodyweight: 76, total: 136, snatch: 61, cleanAndJerk: 75, backSquat: 95, frontSquat: 82 },
      { bodyweight: 81, total: 145, snatch: 65, cleanAndJerk: 80, backSquat: 102, frontSquat: 87 },
      { bodyweight: 87, total: 155, snatch: 70, cleanAndJerk: 85, backSquat: 109, frontSquat: 93 },
      { bodyweight: 88, total: 160, snatch: 72, cleanAndJerk: 88, backSquat: 112, frontSquat: 96 },
    ],
  },
  {
    level: 3, ...LEVEL_DESCRIPTIONS[3],
    men: [
      { bodyweight: 55, total: 157, snatch: 71, cleanAndJerk: 86, backSquat: 110, frontSquat: 94 },
      { bodyweight: 61, total: 180, snatch: 81, cleanAndJerk: 99, backSquat: 126, frontSquat: 108 },
      { bodyweight: 67, total: 194, snatch: 87, cleanAndJerk: 107, backSquat: 136, frontSquat: 116 },
      { bodyweight: 73, total: 205, snatch: 92, cleanAndJerk: 113, backSquat: 144, frontSquat: 123 },
      { bodyweight: 81, total: 222, snatch: 100, cleanAndJerk: 122, backSquat: 155, frontSquat: 133 },
      { bodyweight: 89, total: 238, snatch: 107, cleanAndJerk: 131, backSquat: 167, frontSquat: 143 },
      { bodyweight: 96, total: 245, snatch: 110, cleanAndJerk: 135, backSquat: 172, frontSquat: 147 },
      { bodyweight: 102, total: 252, snatch: 113, cleanAndJerk: 139, backSquat: 176, frontSquat: 151 },
      { bodyweight: 109, total: 257, snatch: 116, cleanAndJerk: 141, backSquat: 180, frontSquat: 154 },
      { bodyweight: 110, total: 266, snatch: 120, cleanAndJerk: 146, backSquat: 186, frontSquat: 160 },
    ],
    women: [
      { bodyweight: 45, total: 102, snatch: 46, cleanAndJerk: 56, backSquat: 71, frontSquat: 61 },
      { bodyweight: 49, total: 109, snatch: 49, cleanAndJerk: 60, backSquat: 76, frontSquat: 65 },
      { bodyweight: 55, total: 125, snatch: 56, cleanAndJerk: 69, backSquat: 88, frontSquat: 75 },
      { bodyweight: 59, total: 135, snatch: 61, cleanAndJerk: 74, backSquat: 95, frontSquat: 81 },
      { bodyweight: 64, total: 140, snatch: 63, cleanAndJerk: 77, backSquat: 98, frontSquat: 84 },
      { bodyweight: 71, total: 151, snatch: 68, cleanAndJerk: 83, backSquat: 106, frontSquat: 91 },
      { bodyweight: 76, total: 156, snatch: 70, cleanAndJerk: 86, backSquat: 109, frontSquat: 94 },
      { bodyweight: 81, total: 163, snatch: 73, cleanAndJerk: 90, backSquat: 114, frontSquat: 98 },
      { bodyweight: 87, total: 170, snatch: 77, cleanAndJerk: 94, backSquat: 119, frontSquat: 102 },
      { bodyweight: 88, total: 175, snatch: 79, cleanAndJerk: 96, backSquat: 123, frontSquat: 105 },
    ],
  },
  {
    level: 4, ...LEVEL_DESCRIPTIONS[4],
    men: [
      { bodyweight: 55, total: 174, snatch: 78, cleanAndJerk: 96, backSquat: 122, frontSquat: 104 },
      { bodyweight: 61, total: 204, snatch: 92, cleanAndJerk: 112, backSquat: 143, frontSquat: 122 },
      { bodyweight: 67, total: 225, snatch: 101, cleanAndJerk: 124, backSquat: 158, frontSquat: 135 },
      { bodyweight: 73, total: 240, snatch: 108, cleanAndJerk: 132, backSquat: 168, frontSquat: 144 },
      { bodyweight: 81, total: 262, snatch: 118, cleanAndJerk: 144, backSquat: 183, frontSquat: 157 },
      { bodyweight: 89, total: 280, snatch: 126, cleanAndJerk: 154, backSquat: 196, frontSquat: 168 },
      { bodyweight: 96, total: 288, snatch: 130, cleanAndJerk: 158, backSquat: 202, frontSquat: 173 },
      { bodyweight: 102, total: 295, snatch: 133, cleanAndJerk: 162, backSquat: 207, frontSquat: 177 },
      { bodyweight: 109, total: 300, snatch: 135, cleanAndJerk: 165, backSquat: 210, frontSquat: 180 },
      { bodyweight: 110, total: 310, snatch: 140, cleanAndJerk: 170, backSquat: 217, frontSquat: 186 },
    ],
    women: [
      { bodyweight: 45, total: 118, snatch: 53, cleanAndJerk: 65, backSquat: 83, frontSquat: 71 },
      { bodyweight: 49, total: 128, snatch: 58, cleanAndJerk: 70, backSquat: 90, frontSquat: 77 },
      { bodyweight: 55, total: 140, snatch: 63, cleanAndJerk: 77, backSquat: 98, frontSquat: 84 },
      { bodyweight: 59, total: 155, snatch: 70, cleanAndJerk: 85, backSquat: 109, frontSquat: 93 },
      { bodyweight: 64, total: 160, snatch: 72, cleanAndJerk: 88, backSquat: 112, frontSquat: 96 },
      { bodyweight: 71, total: 170, snatch: 77, cleanAndJerk: 94, backSquat: 119, frontSquat: 102 },
      { bodyweight: 76, total: 176, snatch: 79, cleanAndJerk: 97, backSquat: 123, frontSquat: 106 },
      { bodyweight: 81, total: 180, snatch: 81, cleanAndJerk: 99, backSquat: 126, frontSquat: 108 },
      { bodyweight: 87, total: 185, snatch: 83, cleanAndJerk: 102, backSquat: 130, frontSquat: 111 },
      { bodyweight: 88, total: 190, snatch: 86, cleanAndJerk: 105, backSquat: 133, frontSquat: 114 },
    ],
  },
  {
    level: 5, ...LEVEL_DESCRIPTIONS[5],
    men: [
      { bodyweight: 55, total: 228, snatch: 103, cleanAndJerk: 125, backSquat: 160, frontSquat: 137 },
      { bodyweight: 61, total: 241, snatch: 108, cleanAndJerk: 133, backSquat: 169, frontSquat: 145 },
      { bodyweight: 67, total: 270, snatch: 122, cleanAndJerk: 149, backSquat: 189, frontSquat: 162 },
      { bodyweight: 73, total: 289, snatch: 130, cleanAndJerk: 159, backSquat: 202, frontSquat: 173 },
      { bodyweight: 81, total: 311, snatch: 140, cleanAndJerk: 171, backSquat: 218, frontSquat: 187 },
      { bodyweight: 89, total: 330, snatch: 149, cleanAndJerk: 182, backSquat: 231, frontSquat: 198 },
      { bodyweight: 96, total: 340, snatch: 153, cleanAndJerk: 187, backSquat: 238, frontSquat: 204 },
      { bodyweight: 102, total: 350, snatch: 158, cleanAndJerk: 193, backSquat: 245, frontSquat: 210 },
      { bodyweight: 109, total: 360, snatch: 162, cleanAndJerk: 198, backSquat: 252, frontSquat: 216 },
      { bodyweight: 110, total: 376, snatch: 169, cleanAndJerk: 207, backSquat: 263, frontSquat: 226 },
    ],
    women: [
      { bodyweight: 45, total: 134, snatch: 60, cleanAndJerk: 74, backSquat: 94, frontSquat: 80 },
      { bodyweight: 49, total: 146, snatch: 66, cleanAndJerk: 80, backSquat: 102, frontSquat: 88 },
      { bodyweight: 55, total: 165, snatch: 74, cleanAndJerk: 91, backSquat: 116, frontSquat: 99 },
      { bodyweight: 59, total: 187, snatch: 84, cleanAndJerk: 103, backSquat: 131, frontSquat: 112 },
      { bodyweight: 64, total: 192, snatch: 86, cleanAndJerk: 106, backSquat: 134, frontSquat: 115 },
      { bodyweight: 71, total: 202, snatch: 91, cleanAndJerk: 111, backSquat: 141, frontSquat: 121 },
      { bodyweight: 76, total: 210, snatch: 95, cleanAndJerk: 116, backSquat: 147, frontSquat: 126 },
      { bodyweight: 81, total: 220, snatch: 99, cleanAndJerk: 121, backSquat: 154, frontSquat: 132 },
      { bodyweight: 87, total: 223, snatch: 100, cleanAndJerk: 123, backSquat: 156, frontSquat: 134 },
      { bodyweight: 88, total: 240, snatch: 108, cleanAndJerk: 132, backSquat: 168, frontSquat: 144 },
    ],
  },
  {
    level: 6, ...LEVEL_DESCRIPTIONS[6],
    men: [
      { bodyweight: 55, total: 241, snatch: 108, cleanAndJerk: 133, backSquat: 169, frontSquat: 145 },
      { bodyweight: 61, total: 277, snatch: 125, cleanAndJerk: 152, backSquat: 194, frontSquat: 166 },
      { bodyweight: 67, total: 287, snatch: 129, cleanAndJerk: 158, backSquat: 201, frontSquat: 172 },
      { bodyweight: 73, total: 318, snatch: 143, cleanAndJerk: 175, backSquat: 223, frontSquat: 191 },
      { bodyweight: 81, total: 339, snatch: 153, cleanAndJerk: 186, backSquat: 237, frontSquat: 203 },
      { bodyweight: 89, total: 360, snatch: 162, cleanAndJerk: 198, backSquat: 252, frontSquat: 216 },
      { bodyweight: 96, total: 382, snatch: 172, cleanAndJerk: 210, backSquat: 267, frontSquat: 229 },
      { bodyweight: 102, total: 390, snatch: 176, cleanAndJerk: 215, backSquat: 273, frontSquat: 234 },
      { bodyweight: 109, total: 398, snatch: 179, cleanAndJerk: 219, backSquat: 279, frontSquat: 239 },
      { bodyweight: 110, total: 414, snatch: 186, cleanAndJerk: 228, backSquat: 290, frontSquat: 248 },
    ],
    women: [
      { bodyweight: 45, total: 158, snatch: 71, cleanAndJerk: 87, backSquat: 111, frontSquat: 95 },
      { bodyweight: 49, total: 172, snatch: 77, cleanAndJerk: 95, backSquat: 120, frontSquat: 103 },
      { bodyweight: 55, total: 195, snatch: 88, cleanAndJerk: 107, backSquat: 138, frontSquat: 117 },
      { bodyweight: 59, total: 213, snatch: 96, cleanAndJerk: 117, backSquat: 149, frontSquat: 128 },
      { bodyweight: 64, total: 221, snatch: 99, cleanAndJerk: 122, backSquat: 155, frontSquat: 133 },
      { bodyweight: 71, total: 236, snatch: 106, cleanAndJerk: 130, backSquat: 165, frontSquat: 142 },
      { bodyweight: 76, total: 247, snatch: 111, cleanAndJerk: 136, backSquat: 173, frontSquat: 148 },
      { bodyweight: 81, total: 264, snatch: 119, cleanAndJerk: 145, backSquat: 185, frontSquat: 158 },
      { bodyweight: 87, total: 270, snatch: 122, cleanAndJerk: 149, backSquat: 189, frontSquat: 162 },
      { bodyweight: 88, total: 278, snatch: 125, cleanAndJerk: 153, backSquat: 195, frontSquat: 167 },
    ],
  },
  {
    level: 7, ...LEVEL_DESCRIPTIONS[7],
    men: [
      { bodyweight: 55, total: 285, snatch: 128, cleanAndJerk: 157, backSquat: 200, frontSquat: 171 },
      { bodyweight: 61, total: 314, snatch: 141, cleanAndJerk: 173, backSquat: 220, frontSquat: 188 },
      { bodyweight: 67, total: 331, snatch: 149, cleanAndJerk: 182, backSquat: 232, frontSquat: 199 },
      { bodyweight: 73, total: 346, snatch: 156, cleanAndJerk: 190, backSquat: 242, frontSquat: 208 },
      { bodyweight: 81, total: 367, snatch: 165, cleanAndJerk: 202, backSquat: 257, frontSquat: 220 },
      { bodyweight: 89, total: 403, snatch: 181, cleanAndJerk: 222, backSquat: 282, frontSquat: 242 },
      { bodyweight: 96, total: 413, snatch: 186, cleanAndJerk: 227, backSquat: 289, frontSquat: 248 },
      { bodyweight: 102, total: 425, snatch: 191, cleanAndJerk: 234, backSquat: 298, frontSquat: 255 },
      { bodyweight: 109, total: 433, snatch: 195, cleanAndJerk: 238, backSquat: 303, frontSquat: 260 },
      { bodyweight: 110, total: 451, snatch: 203, cleanAndJerk: 248, backSquat: 316, frontSquat: 271 },
    ],
    women: [
      { bodyweight: 45, total: 180, snatch: 81, cleanAndJerk: 99, backSquat: 126, frontSquat: 108 },
      { bodyweight: 49, total: 196, snatch: 88, cleanAndJerk: 108, backSquat: 137, frontSquat: 118 },
      { bodyweight: 55, total: 225, snatch: 101, cleanAndJerk: 124, backSquat: 158, frontSquat: 135 },
      { bodyweight: 59, total: 237, snatch: 107, cleanAndJerk: 130, backSquat: 166, frontSquat: 142 },
      { bodyweight: 64, total: 250, snatch: 113, cleanAndJerk: 138, backSquat: 175, frontSquat: 150 },
      { bodyweight: 71, total: 270, snatch: 122, cleanAndJerk: 149, backSquat: 189, frontSquat: 162 },
      { bodyweight: 76, total: 287, snatch: 129, cleanAndJerk: 158, backSquat: 201, frontSquat: 172 },
      { bodyweight: 81, total: 300, snatch: 135, cleanAndJerk: 165, backSquat: 210, frontSquat: 180 },
      { bodyweight: 87, total: 310, snatch: 140, cleanAndJerk: 171, backSquat: 217, frontSquat: 191 },
      { bodyweight: 88, total: 319, snatch: 144, cleanAndJerk: 175, backSquat: 223, frontSquat: 191 },
    ],
  },
];

export function getStandards() {
  return STANDARDS;
}

const LIFT_KEY_MAP: Record<StandardLift, keyof LevelEntry> = {
  "Snatch": "snatch",
  "Clean & Jerk": "cleanAndJerk",
  "Back Squat": "backSquat",
  "Front Squat": "frontSquat",
  "Total": "total",
};

/**
 * Map programmed workout lift names to the standardized lift names
 * from the Catalyst Athletics chart.
 */
const LIFT_NAME_ALIASES: Record<string, StandardLift> = {
  "snatch": "Snatch",
  "squat snatch": "Snatch",
  "power snatch": "Snatch",
  "hang snatch": "Snatch",
  "hang squat snatch": "Snatch",
  "snatch pull + hang squat snatch": "Snatch",
  "clean & jerk": "Clean & Jerk",
  "clean and jerk": "Clean & Jerk",
  "squat clean": "Clean & Jerk",
  "squat clean + split jerk": "Clean & Jerk",
  "power clean": "Clean & Jerk",
  "power clean + jerk": "Clean & Jerk",
  "clean": "Clean & Jerk",
  "back squat": "Back Squat",
  "front squat": "Front Squat",
};

// ── General Strength Standards (bodyweight-multiplier based) ──
// Source: Normative powerlifting data (809,986 competition entries) + community standards

export type GeneralLift = "Bench Press" | "Deadlift";

interface GeneralStandardLevel {
  level: number;
  label: string;
  multiplier: { male: number; female: number };
}

const GENERAL_STANDARDS: Record<GeneralLift, GeneralStandardLevel[]> = {
  "Bench Press": [
    { level: 1, label: "BEGINNER", multiplier: { male: 0.5, female: 0.3 } },
    { level: 2, label: "NOVICE", multiplier: { male: 0.75, female: 0.45 } },
    { level: 3, label: "INTERMEDIATE", multiplier: { male: 1.0, female: 0.65 } },
    { level: 4, label: "ADVANCED", multiplier: { male: 1.25, female: 0.75 } },
    { level: 5, label: "ELITE", multiplier: { male: 1.75, female: 1.15 } },
  ],
  "Deadlift": [
    { level: 1, label: "BEGINNER", multiplier: { male: 1.0, female: 0.65 } },
    { level: 2, label: "NOVICE", multiplier: { male: 1.25, female: 0.95 } },
    { level: 3, label: "INTERMEDIATE", multiplier: { male: 1.75, female: 1.25 } },
    { level: 4, label: "ADVANCED", multiplier: { male: 2.25, female: 1.75 } },
    { level: 5, label: "ELITE", multiplier: { male: 3.0, female: 2.5 } },
  ],
};

const GENERAL_LIFT_ALIASES: Record<string, GeneralLift> = {
  "bench press": "Bench Press",
  "swiss bar bench press": "Bench Press",
  "swiss bench press": "Bench Press",
  "dumbbell bench press": "Bench Press",
  "deadlift": "Deadlift",
  "sumo deadlift": "Deadlift",
  "hybrid deadlift": "Deadlift",
  "sumo or hybrid deadlift": "Deadlift",
  "3 sumo or hybrid deadlift": "Deadlift",
  "conventional deadlift": "Deadlift",
};

export function mapToGeneralLift(liftName: string): GeneralLift | null {
  const key = liftName.toLowerCase().trim();
  return GENERAL_LIFT_ALIASES[key] ?? null;
}

export interface GeneralStrengthAssessment {
  liftName: GeneralLift;
  userWeight: number;
  level: number;
  levelLabel: string;
  nextLevelTarget: number | null;
  progressInLevel: number;
  thresholds: { level: number; label: string; target: number }[];
}

export function assessGeneralStrength(
  liftName: string,
  oneRepMax: number,
  bodyweightKg: number,
  sex: Sex
): GeneralStrengthAssessment | null {
  const generalLift = mapToGeneralLift(liftName);
  if (!generalLift) return null;

  const levels = GENERAL_STANDARDS[generalLift];
  const thresholds = levels.map((l) => ({
    level: l.level,
    label: l.label,
    target: Math.round(bodyweightKg * l.multiplier[sex] * 2) / 2,
  }));

  let currentLevel = 0;
  for (const t of thresholds) {
    if (oneRepMax >= t.target) currentLevel = t.level;
  }
  if (currentLevel === 0) currentLevel = 1;

  const currentThreshold = thresholds.find((t) => t.level === currentLevel)!;
  const nextThreshold = thresholds.find((t) => t.level === currentLevel + 1);

  let progressInLevel = 0;
  if (currentLevel === 1) {
    progressInLevel = Math.min(oneRepMax / currentThreshold.target, 1);
  } else if (nextThreshold) {
    const range = nextThreshold.target - currentThreshold.target;
    progressInLevel = range > 0 ? Math.min((oneRepMax - currentThreshold.target) / range, 1) : 1;
  } else {
    progressInLevel = 1;
  }

  return {
    liftName: generalLift,
    userWeight: oneRepMax,
    level: currentLevel,
    levelLabel: currentThreshold.label,
    nextLevelTarget: nextThreshold?.target ?? null,
    progressInLevel: Math.max(0, Math.min(1, progressInLevel)),
    thresholds,
  };
}

export function mapToStandardLift(liftName: string): StandardLift | null {
  const key = liftName.toLowerCase().trim();
  return LIFT_NAME_ALIASES[key] ?? null;
}

function findClosestWeightClass(entries: LevelEntry[], bodyweight: number): LevelEntry {
  let closest = entries[0];
  let minDiff = Math.abs(bodyweight - closest.bodyweight);
  for (const entry of entries) {
    const diff = Math.abs(bodyweight - entry.bodyweight);
    if (diff < minDiff) {
      minDiff = diff;
      closest = entry;
    }
  }
  return closest;
}

export interface StrengthAssessment {
  standardLift: StandardLift;
  userWeight: number;
  level: number;
  levelLabel: string;
  levelDescription: string;
  nextLevelTarget: number | null;
  progressInLevel: number;
  thresholds: { level: number; label: string; target: number }[];
}

/**
 * Given a user's 1RM for a lift, their bodyweight and sex,
 * determine their current level (1-7) and progress within it.
 */
export function assessStrength(
  liftName: string,
  oneRepMax: number,
  bodyweightKg: number,
  sex: Sex
): StrengthAssessment | null {
  const standardLift = mapToStandardLift(liftName);
  if (!standardLift) return null;

  const liftKey = LIFT_KEY_MAP[standardLift];

  const thresholds = STANDARDS.map((levelData) => {
    const entries = sex === "male" ? levelData.men : levelData.women;
    const closest = findClosestWeightClass(entries, bodyweightKg);
    return {
      level: levelData.level,
      label: levelData.label,
      description: levelData.description,
      target: closest[liftKey] as number,
    };
  });

  let currentLevel = 0;
  for (const t of thresholds) {
    if (oneRepMax >= t.target) {
      currentLevel = t.level;
    }
  }

  if (currentLevel === 0) currentLevel = 1;

  const currentThreshold = thresholds.find((t) => t.level === currentLevel)!;
  const nextThreshold = thresholds.find((t) => t.level === currentLevel + 1);

  let progressInLevel = 0;
  if (currentLevel === 1) {
    progressInLevel = Math.min(oneRepMax / currentThreshold.target, 1);
  } else if (nextThreshold) {
    const prevTarget = currentThreshold.target;
    const nextTarget = nextThreshold.target;
    const range = nextTarget - prevTarget;
    progressInLevel = range > 0 ? Math.min((oneRepMax - prevTarget) / range, 1) : 1;
  } else {
    progressInLevel = 1;
  }

  return {
    standardLift,
    userWeight: oneRepMax,
    level: currentLevel,
    levelLabel: currentThreshold.label,
    levelDescription: currentThreshold.description,
    nextLevelTarget: nextThreshold?.target ?? null,
    progressInLevel: Math.max(0, Math.min(1, progressInLevel)),
    thresholds: thresholds.map((t) => ({
      level: t.level,
      label: t.label,
      target: t.target,
    })),
  };
}
