import type { Sex } from "./strength-standards";

export interface WodTier {
  name: string;
  icon: string;
  color: string;
}

export const TIERS: WodTier[] = [
  { name: "DRAGON", icon: "local_fire_department", color: "#ff4444" },
  { name: "BEAST", icon: "pets", color: "#cafd00" },
  { name: "WARRIOR", icon: "shield", color: "#f3ffca" },
  { name: "HUNTER", icon: "target", color: "#adaaaa" },
  { name: "ROOKIE", icon: "hiking", color: "#777575" },
];

// Brackets are in seconds for TIME-based, rounds for ROUNDS_REPS.
// For TIME: lower is better, so dragon = fastest.
// For ROUNDS_REPS: higher is better, so dragon = most rounds.
interface TierBrackets {
  dragon: number;
  beast: number;
  warrior: number;
  hunter: number;
}

interface BenchmarkWodEntry {
  name: string;
  scoreType: "TIME" | "ROUNDS_REPS";
  description: string;
  movements: string;
  male: TierBrackets;
  female: TierBrackets;
}

// Sources: BTWB normative data, EVOX standards, Springer Open research (n=10,000+)
const BENCHMARK_WODS: BenchmarkWodEntry[] = [
  // ── GIRL WODS ──
  {
    name: "Fran",
    scoreType: "TIME",
    description: "21-15-9 Thrusters & Pull-ups",
    movements: "Thrusters (43/30kg), Pull-ups",
    male:   { dragon: 150, beast: 210, warrior: 300, hunter: 480 },
    female: { dragon: 210, beast: 300, warrior: 420, hunter: 600 },
  },
  {
    name: "Grace",
    scoreType: "TIME",
    description: "30 Clean & Jerks for time",
    movements: "Clean & Jerks (60/43kg)",
    male:   { dragon: 90, beast: 150, warrior: 240, hunter: 360 },
    female: { dragon: 120, beast: 180, warrior: 300, hunter: 420 },
  },
  {
    name: "Helen",
    scoreType: "TIME",
    description: "3 rounds: 400m run, 21 KB swings, 12 pull-ups",
    movements: "Run, KB Swings (24/16kg), Pull-ups",
    male:   { dragon: 420, beast: 540, warrior: 660, hunter: 840 },
    female: { dragon: 510, beast: 630, warrior: 780, hunter: 960 },
  },
  {
    name: "Diane",
    scoreType: "TIME",
    description: "21-15-9 Deadlifts & HSPUs",
    movements: "Deadlifts (102.5/70kg), Handstand Push-ups",
    male:   { dragon: 180, beast: 300, warrior: 480, hunter: 720 },
    female: { dragon: 240, beast: 420, warrior: 600, hunter: 840 },
  },
  {
    name: "Cindy",
    scoreType: "ROUNDS_REPS",
    description: "AMRAP 20: 5 pull-ups, 10 push-ups, 15 squats",
    movements: "Pull-ups, Push-ups, Air Squats",
    male:   { dragon: 30, beast: 25, warrior: 20, hunter: 14 },
    female: { dragon: 27, beast: 22, warrior: 17, hunter: 12 },
  },
  {
    name: "Jackie",
    scoreType: "TIME",
    description: "1000m row, 50 thrusters, 30 pull-ups",
    movements: "Row, Thrusters (20/15kg), Pull-ups",
    male:   { dragon: 420, beast: 540, warrior: 660, hunter: 840 },
    female: { dragon: 510, beast: 660, warrior: 780, hunter: 960 },
  },
  {
    name: "Isabel",
    scoreType: "TIME",
    description: "30 Snatches for time",
    movements: "Snatches (60/43kg)",
    male:   { dragon: 90, beast: 150, warrior: 240, hunter: 360 },
    female: { dragon: 120, beast: 210, warrior: 300, hunter: 420 },
  },
  {
    name: "Karen",
    scoreType: "TIME",
    description: "150 Wall Balls for time",
    movements: "Wall Balls (9/6kg to 10/9ft)",
    male:   { dragon: 420, beast: 540, warrior: 660, hunter: 840 },
    female: { dragon: 510, beast: 660, warrior: 780, hunter: 960 },
  },
  {
    name: "Elizabeth",
    scoreType: "TIME",
    description: "21-15-9 Squat Cleans & Ring Dips",
    movements: "Squat Cleans (60/43kg), Ring Dips",
    male:   { dragon: 180, beast: 300, warrior: 420, hunter: 600 },
    female: { dragon: 240, beast: 360, warrior: 480, hunter: 720 },
  },
  {
    name: "Nancy",
    scoreType: "TIME",
    description: "5 rounds: 400m run, 15 overhead squats",
    movements: "Run, Overhead Squats (43/30kg)",
    male:   { dragon: 720, beast: 900, warrior: 1140, hunter: 1440 },
    female: { dragon: 840, beast: 1080, warrior: 1320, hunter: 1680 },
  },
  {
    name: "Annie",
    scoreType: "TIME",
    description: "50-40-30-20-10 Double-unders & Sit-ups",
    movements: "Double-unders, Sit-ups",
    male:   { dragon: 300, beast: 420, warrior: 540, hunter: 720 },
    female: { dragon: 360, beast: 480, warrior: 600, hunter: 780 },
  },
  {
    name: "Angie",
    scoreType: "TIME",
    description: "100 pull-ups, 100 push-ups, 100 sit-ups, 100 squats",
    movements: "Pull-ups, Push-ups, Sit-ups, Air Squats",
    male:   { dragon: 900, beast: 1200, warrior: 1500, hunter: 1920 },
    female: { dragon: 1080, beast: 1380, warrior: 1800, hunter: 2280 },
  },
  {
    name: "Barbara",
    scoreType: "TIME",
    description: "5 rounds: 20 pull-ups, 30 push-ups, 40 sit-ups, 50 squats (3 min rest)",
    movements: "Pull-ups, Push-ups, Sit-ups, Air Squats",
    male:   { dragon: 1500, beast: 1800, warrior: 2100, hunter: 2580 },
    female: { dragon: 1800, beast: 2100, warrior: 2520, hunter: 3000 },
  },
  {
    name: "Kelly",
    scoreType: "TIME",
    description: "5 rounds: 400m run, 30 box jumps, 30 wall balls",
    movements: "Run, Box Jumps (24/20in), Wall Balls (9/6kg)",
    male:   { dragon: 1260, beast: 1560, warrior: 1860, hunter: 2280 },
    female: { dragon: 1500, beast: 1800, warrior: 2160, hunter: 2640 },
  },
  {
    name: "Mary",
    scoreType: "ROUNDS_REPS",
    description: "AMRAP 20: 5 HSPU, 10 pistols, 15 pull-ups",
    movements: "Handstand Push-ups, Pistols, Pull-ups",
    male:   { dragon: 18, beast: 14, warrior: 10, hunter: 6 },
    female: { dragon: 15, beast: 11, warrior: 8, hunter: 5 },
  },
  {
    name: "Amanda",
    scoreType: "TIME",
    description: "9-7-5 Muscle-ups & Squat Snatches",
    movements: "Muscle-ups, Squat Snatches (60/43kg)",
    male:   { dragon: 240, beast: 360, warrior: 540, hunter: 780 },
    female: { dragon: 300, beast: 480, warrior: 660, hunter: 900 },
  },
  {
    name: "Eva",
    scoreType: "TIME",
    description: "5 rounds: 800m run, 30 KB swings, 30 pull-ups",
    movements: "Run, KB Swings (32/24kg), Pull-ups",
    male:   { dragon: 1560, beast: 1920, warrior: 2340, hunter: 2880 },
    female: { dragon: 1800, beast: 2280, warrior: 2700, hunter: 3300 },
  },
  {
    name: "Nicole",
    scoreType: "ROUNDS_REPS",
    description: "AMRAP 20: 400m run, max pull-ups",
    movements: "Run, Pull-ups",
    male:   { dragon: 150, beast: 120, warrior: 90, hunter: 60 },
    female: { dragon: 120, beast: 95, warrior: 70, hunter: 45 },
  },

  // ── HERO WODS ──
  {
    name: "Murph",
    scoreType: "TIME",
    description: "1 mile run, 100 pull-ups, 200 push-ups, 300 squats, 1 mile run",
    movements: "Run, Pull-ups, Push-ups, Squats (w/ vest)",
    male:   { dragon: 1800, beast: 2400, warrior: 3300, hunter: 3600 },
    female: { dragon: 2280, beast: 2880, warrior: 3480, hunter: 4200 },
  },
  {
    name: "Nate",
    scoreType: "ROUNDS_REPS",
    description: "AMRAP 20: 2 MU, 4 HSPU, 8 KBS",
    movements: "Muscle-ups, Handstand Push-ups, KB Swings (32/24kg)",
    male:   { dragon: 16, beast: 12, warrior: 8, hunter: 4 },
    female: { dragon: 14, beast: 10, warrior: 6, hunter: 3 },
  },
  {
    name: "DT",
    scoreType: "TIME",
    description: "5 rounds: 12 DL, 9 HPC, 6 push jerks",
    movements: "Deadlifts, Hang Power Cleans, Push Jerks (70/47.5kg)",
    male:   { dragon: 300, beast: 480, warrior: 780, hunter: 900 },
    female: { dragon: 360, beast: 540, warrior: 840, hunter: 960 },
  },
  {
    name: "Randy",
    scoreType: "TIME",
    description: "75 Power Snatches for time",
    movements: "Power Snatches (34/24kg)",
    male:   { dragon: 165, beast: 240, warrior: 360, hunter: 480 },
    female: { dragon: 210, beast: 300, warrior: 420, hunter: 600 },
  },
  {
    name: "Badger",
    scoreType: "TIME",
    description: "3 rounds: 30 squat cleans, 30 pull-ups, 800m run",
    movements: "Squat Cleans (43/30kg), Pull-ups, Run",
    male:   { dragon: 1080, beast: 1500, warrior: 2280, hunter: 2400 },
    female: { dragon: 1260, beast: 1680, warrior: 2400, hunter: 2640 },
  },
  {
    name: "Josh",
    scoreType: "TIME",
    description: "21-15-9 OHS & Pull-ups (42-30-18)",
    movements: "Overhead Squats (43/29kg), Pull-ups",
    male:   { dragon: 480, beast: 780, warrior: 1200, hunter: 1320 },
    female: { dragon: 540, beast: 840, warrior: 1260, hunter: 1440 },
  },
  {
    name: "Loredo",
    scoreType: "TIME",
    description: "6 rounds: 24 squats, 24 push-ups, 24 lunges, 400m run",
    movements: "Air Squats, Push-ups, Walking Lunges, Run",
    male:   { dragon: 1320, beast: 1800, warrior: 2400, hunter: 2640 },
    female: { dragon: 1500, beast: 2040, warrior: 2640, hunter: 2880 },
  },
  {
    name: "Luce",
    scoreType: "TIME",
    description: "3 rounds: 1000m run, 10 MU, 100 squats (w/ vest)",
    movements: "Run, Muscle-ups, Air Squats (w/ vest)",
    male:   { dragon: 1800, beast: 2520, warrior: 3300, hunter: 3600 },
    female: { dragon: 2100, beast: 2820, warrior: 3480, hunter: 3900 },
  },
  {
    name: "Michael",
    scoreType: "TIME",
    description: "3 rounds: 800m run, 50 back ext, 50 sit-ups",
    movements: "Run, Back Extensions, Sit-ups",
    male:   { dragon: 1200, beast: 1680, warrior: 2280, hunter: 2400 },
    female: { dragon: 1380, beast: 1860, warrior: 2400, hunter: 2640 },
  },
  {
    name: "RJ",
    scoreType: "TIME",
    description: "5 rounds: 800m run, 5 rope climbs, 50 push-ups",
    movements: "Run, Rope Climbs (15ft), Push-ups",
    male:   { dragon: 1800, beast: 2520, warrior: 3300, hunter: 3600 },
    female: { dragon: 2100, beast: 2820, warrior: 3480, hunter: 3900 },
  },
  {
    name: "The Seven",
    scoreType: "TIME",
    description: "7 rounds: 7 thrusters, 4 rope climbs, 7 DL, 7 burpees, 7 KBS, 7 pull-ups",
    movements: "Thrusters (61/43kg), Rope Climbs, Deadlifts (111/75kg), HSPUs, Burpees, KB Swings (32/24kg), Pull-ups",
    male:   { dragon: 1680, beast: 2400, warrior: 3300, hunter: 3600 },
    female: { dragon: 1980, beast: 2700, warrior: 3480, hunter: 3900 },
  },
];

function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(":");
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return parseInt(parts[0]) || 0;
}

function parseRoundsReps(scoreStr: string): number {
  const parts = scoreStr.split("+");
  const rounds = parseInt(parts[0]) || 0;
  const reps = parseInt(parts[1]) || 0;
  return rounds + reps / 100;
}

export function findBenchmarkWod(wodName: string): BenchmarkWodEntry | null {
  const lower = wodName.toLowerCase().trim();
  return BENCHMARK_WODS.find((w) => w.name.toLowerCase() === lower) ?? null;
}

export interface WodTierResult {
  tier: WodTier;
  tierIndex: number;
  benchmarkWod: BenchmarkWodEntry;
  percentileLabel: string;
}

export function assessWodScore(
  wodName: string,
  scoreValue: string,
  scoreType: "TIME" | "ROUNDS_REPS",
  sex: Sex
): WodTierResult | null {
  const benchmark = findBenchmarkWod(wodName);
  if (!benchmark) return null;
  if (benchmark.scoreType !== scoreType) return null;

  const brackets = benchmark[sex];

  if (scoreType === "TIME") {
    const seconds = parseTimeToSeconds(scoreValue);
    if (seconds <= 0) return null;

    let tierIdx: number;
    if (seconds <= brackets.dragon) tierIdx = 0;
    else if (seconds <= brackets.beast) tierIdx = 1;
    else if (seconds <= brackets.warrior) tierIdx = 2;
    else if (seconds <= brackets.hunter) tierIdx = 3;
    else tierIdx = 4;

    const labels = ["Top 2%", "Top 16%", "Top 50%", "Top 84%", "Getting started"];
    return {
      tier: TIERS[tierIdx],
      tierIndex: tierIdx,
      benchmarkWod: benchmark,
      percentileLabel: labels[tierIdx],
    };
  } else {
    const score = parseRoundsReps(scoreValue);
    if (score <= 0) return null;

    let tierIdx: number;
    if (score >= brackets.dragon) tierIdx = 0;
    else if (score >= brackets.beast) tierIdx = 1;
    else if (score >= brackets.warrior) tierIdx = 2;
    else if (score >= brackets.hunter) tierIdx = 3;
    else tierIdx = 4;

    const labels = ["Top 2%", "Top 16%", "Top 50%", "Top 84%", "Getting started"];
    return {
      tier: TIERS[tierIdx],
      tierIndex: tierIdx,
      benchmarkWod: benchmark,
      percentileLabel: labels[tierIdx],
    };
  }
}

export function getAllBenchmarkWods() {
  return BENCHMARK_WODS;
}
