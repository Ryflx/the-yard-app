import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "./index";
import { workouts, workoutSections } from "./schema";
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
  // ── MONDAY 7 APRIL ──
  {
    date: "2026-04-07",
    title: "Monday",
    sections: [
      {
        type: "WARM UP",
        sets: "3 sets",
        exercises: [
          { name: "1:00 bike (S/M/F)" },
          { name: "10 box step/jump overs" },
          { name: "5 press ups to down dog" },
        ],
      },
      {
        type: "STRENGTH",
        sets: "3-3-3-3-3",
        exercises: [{ name: "Swiss bar bench press" }],
      },
      {
        type: "WOD",
        wodScoreType: "INTERVAL",
        exercises: [
          { name: "12/15 cal echo bike" },
          { name: "15 box jump overs (20/24)" },
          { name: "200-m run" },
        ],
      },
      {
        type: "ON RAMP",
        exercises: [
          { name: "7/10 cal echo bike" },
          { name: "10 box step overs" },
          { name: "200-m run" },
        ],
      },
    ],
  },
  // ── TUESDAY 8 APRIL ──
  {
    date: "2026-04-08",
    title: "Tuesday",
    sections: [
      {
        type: "WARM UP",
        sets: "3 sets",
        exercises: [
          { name: ":30 on // :30 off skipping (singles/ratios/doubles)" },
          { name: "10 cossack squats" },
          { name: "10 kang squats" },
        ],
      },
      {
        type: "HEAVY DAY",
        sets: "5 sets",
        exercises: [{ name: "3 Sumo or hybrid deadlift" }],
      },
      {
        type: "WOD",
        wodScoreType: "TIME",
        timeCap: 720,
        rxWeights: "100/142.5",
        exercises: [
          { name: "5 sumo/hybrid deadlifts" },
          { name: "20 burpees" },
          { name: "100 double unders" },
        ],
        wodName: "3 rounds for time",
      },
      {
        type: "ON RAMP",
        exercises: [
          { name: "5 sumo/hybrid deadlifts (35/52.5)" },
          { name: "10 burpees" },
          { name: "75 single unders" },
        ],
      },
    ],
  },
  // ── WEDNESDAY 9 APRIL ──
  {
    date: "2026-04-09",
    title: "Wednesday",
    sections: [
      {
        type: "WARM UP",
        exercises: [
          { name: "30 banded pass throughs" },
          { name: "20 tall plank rotations" },
          { name: "10 scapular pull ups" },
          { name: ":15 ring support hold" },
          { name: ":15 chin over bar hold" },
        ],
      },
      {
        type: "SKILL",
        sets: "Every 4:00 x 4",
        exercises: [
          { name: "40s chin over bar hold" },
          { name: "40s ring support hold" },
        ],
      },
      {
        type: "WOD",
        wodScoreType: "ROUNDS_REPS",
        timeCap: 900,
        wodName: "AMRAP 15",
        exercises: [
          { name: "10 toes to bar" },
          { name: "20 press ups" },
          { name: "10 pull ups" },
          { name: "20 sit ups" },
        ],
      },
      {
        type: "ON RAMP",
        exercises: [
          { name: "10 hanging knee raises" },
          { name: "15 press ups" },
          { name: "10 ring rows" },
          { name: "15 sit ups" },
        ],
      },
    ],
  },
  // ── THURSDAY 10 APRIL ──
  {
    date: "2026-04-10",
    title: "Thursday",
    sections: [
      {
        type: "WARM UP",
        exercises: [
          { name: "10 GSA" },
          { name: "10 seal dips" },
          { name: "10 single arm bridges" },
          { name: "10 warrior squats" },
          { name: "20 front rack openers" },
          { name: "10 tempo front squats (31X1)" },
        ],
      },
      {
        type: "LOADING UP",
        sets: "5 sets",
        exercises: [
          { name: "1 hang clean (above the knee)" },
          { name: "1 hang clean (below the knee)" },
          { name: "1 clean" },
        ],
      },
      {
        type: "WOD",
        wodScoreType: "TIME",
        timeCap: 900,
        rxWeights: "55/80",
        exercises: [
          { name: "800-m run" },
          { name: "8 squat cleans" },
          { name: "600-m run" },
          { name: "6 squat cleans" },
          { name: "400-m run" },
          { name: "4 squat cleans" },
          { name: "200-m run" },
          { name: "2 squat cleans" },
        ],
      },
    ],
  },
  // ── FRIDAY 11 APRIL ──
  {
    date: "2026-04-11",
    title: "Friday",
    sections: [
      {
        type: "WARM UP",
        exercises: [
          { name: "10 KB good mornings" },
          { name: "10 tall plank rotations" },
          { name: "5 inchworm press ups" },
          { name: "10 deadstop KBS" },
          { name: "10 press ups to downward dog" },
          { name: ":10 HS hold (on box or wall)" },
          { name: "10 Russian KBS" },
          { name: "5 box HSPUs / 3 negative HSPUs" },
          { name: "10 American KBS" },
          { name: "5 HSPUs (workout scale)" },
        ],
      },
      {
        type: "SKILL",
        sets: "EMOM 5",
        exercises: [{ name: "1-2 ring muscle ups" }],
      },
      {
        type: "WOD",
        wodScoreType: "ROUNDS_REPS",
        timeCap: 1200,
        wodName: "Nate",
        rxWeights: "24/32",
        exercises: [
          { name: "2 muscle-ups" },
          { name: "4 handstand push-ups" },
          { name: "8 kettlebell swings" },
        ],
      },
    ],
  },
];

async function seed() {
  console.log("Seeding CrossFit workouts for the week of 7-11 April 2026...\n");

  for (const w of CROSSFIT_WORKOUTS) {
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

  console.log("\nDone! 5 CrossFit workouts seeded for this week.");
  process.exit(0);
}

seed();
