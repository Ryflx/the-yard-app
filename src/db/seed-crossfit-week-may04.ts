import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "./index";
import { workouts, workoutSections } from "./schema";
import { eq, and } from "drizzle-orm";
import type { WorkoutSectionType, WodScoreType, SectionExercise } from "./schema";

interface SectionData {
  type: WorkoutSectionType;
  sets?: string;
  exercises: SectionExercise[];
  wodScoreType?: WodScoreType;
  timeCap?: number;
  wodName?: string;
  rxWeights?: string;
}

interface WorkoutData {
  date: string;
  title: string;
  sections: SectionData[];
}

const CROSSFIT_WORKOUTS: WorkoutData[] = [
  // ── TUESDAY 5 MAY ──
  {
    date: "2026-05-05",
    title: "Tuesday",
    sections: [
      {
        type: "WARM UP",
        sets: "1 set",
        exercises: [
          { name: "30 jumping jacks" },
          { name: "20 PVC pass throughs" },
          { name: "10 mountain climbers" },
        ],
      },
      {
        type: "WARM UP",
        sets: "1 set",
        exercises: [
          { name: "10 PVC front squats" },
          { name: "10 PVC strict press in split" },
        ],
      },
      {
        type: "WARM UP",
        sets: "1 set",
        exercises: [
          { name: "10 PVC high hang squat cleans" },
          { name: "10 PVC jerk balances" },
        ],
      },
      {
        type: "WARM UP",
        sets: "1 set",
        exercises: [
          { name: "10 PVC hang squat cleans" },
          { name: "10 PVC split jerks" },
        ],
      },
      {
        type: "STRENGTH",
        sets: "5 sets",
        exercises: [
          { name: "2 squat clean and split jerks" },
          { name: "- lift every 3:00" },
        ],
      },
      {
        type: "WOD",
        wodName: "EMOM 12",
        wodScoreType: "INTERVAL",
        timeCap: 720,
        rxWeights: "6/9",
        exercises: [
          { name: "1) 25 wall ball shots (6/9)" },
          { name: "2) 8 strict pull ups" },
        ],
      },
    ],
  },
  // ── WEDNESDAY 6 MAY ──
  {
    date: "2026-05-06",
    title: "Wednesday",
    sections: [
      {
        type: "WARM UP",
        sets: "2 sets",
        exercises: [
          { name: "5 inworm walk outs" },
          { name: "10 plate good mornings" },
        ],
      },
      {
        type: "WARM UP",
        sets: "2 sets",
        exercises: [
          { name: "5 plank to handstand hold on box" },
          { name: "10 box step downs (5/5)" },
        ],
      },
      {
        type: "STRENGTH",
        sets: "5 sets",
        exercises: [
          { name: "5 deadlifts" },
          { name: "- build heavier than WOD weight" },
        ],
      },
      {
        type: "WOD",
        wodName: "Diane • 21-15-9 for time",
        wodScoreType: "TIME",
        timeCap: 900,
        rxWeights: "70/102",
        exercises: [
          { name: "Deadlifts (70/102)" },
          { name: "HSPU" },
        ],
      },
    ],
  },
  // ── THURSDAY 7 MAY ──
  {
    date: "2026-05-07",
    title: "Thursday",
    sections: [
      {
        type: "WARM UP",
        sets: "2 sets",
        exercises: [
          { name: "10 banded pass throughs" },
          { name: "10 banded good mornings" },
        ],
      },
      {
        type: "WARM UP",
        sets: "2 sets",
        exercises: [
          { name: "10 overhead squats" },
          { name: "10 barbell good mornings" },
        ],
      },
      {
        type: "STRENGTH",
        sets: "Every 2:00 x 10 rounds",
        exercises: [
          { name: "2 hang power snatches" },
          { name: "- start with the bar and add weight every round if mechanics allow" },
        ],
      },
      {
        type: "WOD",
        wodName: "For time",
        wodScoreType: "TIME",
        timeCap: 600,
        rxWeights: "30/42.5",
        exercises: [
          { name: "1800/2400-m bike" },
          { name: "30 hang power snatches (30/42.5)" },
          { name: "30 TTB" },
        ],
      },
      {
        type: "ON RAMP",
        wodName: "For time",
        wodScoreType: "TIME",
        timeCap: 600,
        rxWeights: "15/20",
        exercises: [
          { name: "1400/1800-m bike" },
          { name: "20 hang power snatches (15/20)" },
          { name: "20 hanging knee raises" },
        ],
      },
    ],
  },
  // ── FRIDAY 8 MAY ──
  {
    date: "2026-05-08",
    title: "Friday",
    sections: [
      {
        type: "WARM UP",
        sets: "1 set",
        exercises: [
          { name: "10 GSA" },
          { name: "10 press ups to down dog" },
        ],
      },
      {
        type: "WARM UP",
        sets: "1 set",
        exercises: [
          { name: "10 tempo air squats" },
          { name: "10 down ups" },
        ],
      },
      {
        type: "WARM UP",
        sets: "1 set",
        exercises: [
          { name: "10 air squats" },
          { name: "10 burpees" },
        ],
      },
      {
        type: "SKILL",
        sets: "EMOM 6",
        exercises: [
          { name: "Ring complex (3-5 movements)" },
          { name: "- ring muscle ups, ring dips, toes through rings, hips to rings" },
        ],
      },
      {
        type: "WOD",
        wodName: "AMRAP 20",
        wodScoreType: "ROUNDS_REPS",
        timeCap: 1200,
        exercises: [
          { name: "5 ring muscle ups" },
          { name: "10 burpees" },
          { name: "15 air squats" },
        ],
      },
      {
        type: "ON RAMP",
        wodName: "AMRAP 20",
        wodScoreType: "ROUNDS_REPS",
        timeCap: 1200,
        exercises: [
          { name: "5 banded strict pull ups" },
          { name: "10 burpees" },
          { name: "15 air squats" },
        ],
      },
    ],
  },
  // ── SATURDAY 9 MAY ──
  {
    date: "2026-05-09",
    title: "Saturday",
    sections: [
      {
        type: "WARM UP",
        sets: "In Pairs • 1 set",
        exercises: [{ name: "400-m run" }],
      },
      {
        type: "WARM UP",
        sets: "1 set",
        exercises: [
          { name: "10 synchronised box step overs" },
          { name: "3 pulls to stand (each)" },
        ],
      },
      {
        type: "WARM UP",
        sets: "1 set",
        exercises: [
          { name: "10 synchronised box jump overs" },
          { name: "5 hanging knee raises on rope (each)" },
        ],
      },
      {
        type: "WOD",
        wodName: "E5M x6 with a partner",
        wodScoreType: "INTERVAL",
        timeCap: 1800,
        exercises: [
          { name: "400-m run (together)" },
          { name: "30 synchronised box jump overs (step down)" },
          { name: "max reps rope climb in remaining time" },
        ],
      },
      {
        type: "ON RAMP",
        wodName: "E5M x6 with a partner",
        wodScoreType: "INTERVAL",
        timeCap: 1800,
        exercises: [
          { name: "400-m run (split)" },
          { name: "20 synchronised box step overs (step down)" },
          { name: "max reps pulls to stand in remaining time" },
        ],
      },
    ],
  },
];

async function seed() {
  console.log("Seeding CrossFit workouts for 5-9 May 2026...\n");

  for (const w of CROSSFIT_WORKOUTS) {
    const existing = await db
      .select({ id: workouts.id })
      .from(workouts)
      .where(and(eq(workouts.date, w.date), eq(workouts.classType, "CROSSFIT")));

    if (existing.length > 0) {
      for (const ex of existing) {
        await db.delete(workoutSections).where(eq(workoutSections.workoutId, ex.id));
        await db.delete(workouts).where(eq(workouts.id, ex.id));
      }
      console.log(`  ↻ Replaced existing CrossFit workout on ${w.date}`);
    }

    const [workout] = await db
      .insert(workouts)
      .values({ date: w.date, title: w.title, classType: "CROSSFIT" })
      .returning();

    for (let i = 0; i < w.sections.length; i++) {
      const s = w.sections[i];
      await db.insert(workoutSections).values({
        workoutId: workout.id,
        type: s.type,
        sortOrder: i,
        liftName: null,
        sets: s.sets ?? null,
        exercises: s.exercises,
        wodScoreType: s.wodScoreType ?? null,
        timeCap: s.timeCap ?? null,
        wodName: s.wodName ?? null,
        rxWeights: s.rxWeights ?? null,
      });
    }

    const sectionSummary = w.sections.map((s) => s.type).join(" → ");
    console.log(`  ✓ ${w.date} (${w.title}): ${sectionSummary}`);
  }

  console.log("\nDone! 5 CrossFit workouts seeded.");
  process.exit(0);
}

seed();
