import type {
  WodFormat,
  WodScoreType,
  WodMovement,
  SectionExercise,
  WorkoutSectionType,
  ClassType,
} from "@/db/schema";

export interface ParsedSection {
  type: WorkoutSectionType;
  sortOrder: number;
  exercises: SectionExercise[];
  sets?: string;
  liftName?: string;
  wodFormat?: WodFormat;
  wodScoreType?: WodScoreType;
  wodRounds?: number;
  wodInterval?: number;
  timeCap?: number;
  wodName?: string;
  rxWeights?: string;
  wodMovements?: WodMovement[];
  wodDescription?: string;
}

export interface ParsedWorkout {
  classType: ClassType;
  title: string;
  sections: ParsedSection[];
}

const FORMAT_SCORE_DEFAULTS: Record<string, WodScoreType> = {
  FOR_TIME: "TIME",
  ROUNDS_FOR_TIME: "TIME",
  AMRAP: "ROUNDS_REPS",
  EMOM: "ROUNDS_REPS",
  DEATH_BY: "ROUNDS_REPS",
  INTERVAL: "INTERVAL",
  TABATA: "ROUNDS_REPS",
  MAX_LOAD: "LOAD",
};

const SYSTEM_PROMPT = `You are a CrossFit and weightlifting workout parser. Given raw workout text written by a coach, extract structured data.

Return a JSON object matching this exact schema:
{
  "classType": "BARBELL" | "CROSSFIT",
  "title": "<suggested title if none given>",
  "sections": [
    {
      "type": "<one of: WARM UP, PRIMER, OLYMPIC LIFT, STRENGTH 1, STRENGTH 2, STRENGTH 3, ACCESSORY, COOL DOWN, STRENGTH, SKILL, HEAVY DAY, LOADING UP, WOD, ON RAMP>",
      "sortOrder": <integer starting at 0>,
      "exercises": [{"name": "<normalised name>", "reps": "<e.g. 10, 5x3, 3 rounds>", "weight": "<e.g. @ 75%, 32kg>", "percentageSets": [{"reps": "<e.g. 3>", "percentage": <number e.g. 70>}]}],
      "sets": "<e.g. 5 sets, 3x5>",
      "liftName": "<primary lift name for barbell sections>",
      "wodFormat": "<FOR_TIME | ROUNDS_FOR_TIME | AMRAP | EMOM | DEATH_BY | INTERVAL | TABATA | MAX_LOAD>",
      "wodScoreType": "<TIME | ROUNDS_REPS | LOAD | CALS | DISTANCE | INTERVAL>",
      "wodRounds": <number or null>,
      "wodInterval": <seconds or null>,
      "timeCap": <seconds or null>,
      "wodName": "<benchmark name if recognised, e.g. Fran, Cindy>",
      "rxWeights": "<summary e.g. 60/42.5kg>",
      "wodMovements": [{"name": "<normalised>", "reps": "<e.g. 21-15-9, 12, 800m>", "weight": "<e.g. 60/42.5kg>", "unit": "<kg, lb, cal, m>", "note": "<e.g. Odd minutes>"}],
      "wodDescription": "<raw text for this section>"
    }
  ]
}

Rules:
- Detect classType from content: percentage-based Olympic/strength work = BARBELL, WODs/AMRAPs/EMOMs = CROSSFIT
- For barbell sections with percentages (e.g. "3@70%, 2@80%, 1@90%"), you MUST populate the percentageSets array on the exercise. Example: "Deadlift 3@70%, 3@75%, 2@80%, 2@85%, 1@90%" becomes: {"name": "Deadlift", "percentageSets": [{"reps": "3", "percentage": 70}, {"reps": "3", "percentage": 75}, {"reps": "2", "percentage": 80}, {"reps": "2", "percentage": 85}, {"reps": "1", "percentage": 90}]}. Do NOT put percentage text in the "reps" field — always use percentageSets for percentage-based work
- For WOD sections, populate BOTH wodMovements (structured) AND wodDescription (raw text)
- Non-WOD sections: populate exercises array, leave wod* fields null
- Normalise movement abbreviations: C2B→Chest-to-Bar Pull-up, T2B→Toes-to-Bar, HSPU→Handstand Push-up, DU→Double-Under, MU→Muscle-Up, PC→Power Clean, S2OH→Shoulder-to-Overhead, Cal Row→Calorie Row, KB→Kettlebell
- Recognise benchmark WODs by name (Fran, Cindy, Murph, etc.) and set wodName
- For EMOM: wodInterval = seconds per interval (usually 60), wodRounds = total minutes
- For Tabata: wodInterval = 20, wodRounds = 8
- For "X Rounds For Time": wodFormat = ROUNDS_FOR_TIME, wodRounds = X
- Infer wodScoreType from format: AMRAP→ROUNDS_REPS, For Time→TIME, EMOM→ROUNDS_REPS, Max Load→LOAD
- timeCap in seconds (12 min = 720)
- If the coach wrote section headers (Warm Up:, Strength:, WOD:, etc.), use them. If not, infer sections from content.
- Include ALL sections from the text — warm ups, strength, skill, WOD, cool down, on ramp
- Only include fields that have values — omit null/empty fields`;

export async function parseWorkoutWithAI(text: string, movementNames: string[]): Promise<ParsedWorkout> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });

  const movementHint = movementNames.length > 0
    ? `\n\nKnown movements in the database (normalise to these exact names when possible):\n${movementNames.join(", ")}`
    : "";

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: SYSTEM_PROMPT + movementHint,
    messages: [{ role: "user", content: text }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");

  const parsed = JSON.parse(jsonMatch[0]) as ParsedWorkout;

  for (const section of parsed.sections) {
    section.sortOrder = parsed.sections.indexOf(section);
    section.exercises = section.exercises ?? [];
    section.wodMovements = section.wodMovements ?? [];
    if (section.wodFormat && !section.wodScoreType) {
      section.wodScoreType = FORMAT_SCORE_DEFAULTS[section.wodFormat] ?? "TIME";
    }
  }

  return parsed;
}
