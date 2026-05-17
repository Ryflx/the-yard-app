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
  // ── MONDAY 20 APRIL ──
  {
    date: "2026-04-20",
    title: "Monday",
    sections: [
      {
        type: "WARM UP",
        sets: "1 set",
        exercises: [
          { name: "30 banded pass throughs" },
          { name: "20 plank to down dogs" },
          { name: "10 press ups" },
        ],
      },
      {
        type: "STRENGTH",
        sets: "2-2-2-2-2",
        exercises: [{ name: "Swiss Bar Bench Press" }],
      },
      {
        type: "WOD",
        wodName: "40-30-20-10",
        wodScoreType: "TIME",
        timeCap: 720,
        rxWeights: "6/9",
        exercises: [
          { name: "wall ball shots (6/9)" },
          { name: "box jump overs (20/24)" },
        ],
      },
      {
        type: "ON RAMP",
        wodName: "30-20-10",
        wodScoreType: "TIME",
        timeCap: 720,
        exercises: [
          { name: "wall ball shots (3/4)" },
          { name: "box jump overs (3 plates)" },
        ],
      },
    ],
  },
  // ── TUESDAY 21 APRIL ──
  {
    date: "2026-04-21",
    title: "Tuesday",
    sections: [
      {
        type: "WARM UP",
        exercises: [
          { name: "400-m run (1 set)" },
          { name: "10 PVC pass throughs" },
          { name: "10 PVC OH squats" },
        ],
        sets: "2 sets",
      },
      {
        type: "LOADING UP",
        sets: "5 sets",
        exercises: [{ name: "3 power snatches - touch and go reps" }],
      },
      {
        type: "WOD",
        wodName: "3 round for time",
        wodScoreType: "TIME",
        timeCap: 960,
        rxWeights: "35/52.5",
        exercises: [
          { name: "400-m run" },
          { name: "21 TTB" },
          { name: "12 power snatches (35/52.5)" },
        ],
      },
      {
        type: "ON RAMP",
        wodName: "3 round for time",
        wodScoreType: "TIME",
        timeCap: 960,
        exercises: [
          { name: "400-m run" },
          { name: "12 hanging knee raises" },
          { name: "12 power snatches (15/20)" },
        ],
      },
    ],
  },
  // ── WEDNESDAY 22 APRIL ──
  {
    date: "2026-04-22",
    title: "Wednesday",
    sections: [
      {
        type: "WARM UP",
        sets: "2 sets",
        exercises: [
          { name: "10 seal dips" },
          { name: "10 single arm bridges" },
          { name: "10 banded pull aparts" },
        ],
      },
      {
        type: "STRENGTH",
        sets: "Every 4:00 x 4",
        exercises: [
          { name: "Accumulate 50s chin over bar hold" },
          { name: "Accumulate 50s ring support hold" },
          { name: "Partition however you need to" },
          { name: "Scale up to false grip chest to ring holds" },
        ],
      },
      {
        type: "WOD",
        wodName: "AMRAP 15",
        wodScoreType: "ROUNDS_REPS",
        timeCap: 900,
        rxWeights: "42.5/60",
        exercises: [
          { name: "5 wall walks" },
          { name: "10 front rack lunges (42.5/60)" },
        ],
      },
      {
        type: "ON RAMP",
        wodName: "AMRAP 15",
        wodScoreType: "ROUNDS_REPS",
        timeCap: 900,
        exercises: [
          { name: "5 inchworm walk outs" },
          { name: "10 front rack lunges (15/20)" },
        ],
      },
    ],
  },
  // ── THURSDAY 23 APRIL ──
  {
    date: "2026-04-23",
    title: "Thursday",
    sections: [
      {
        type: "WARM UP",
        sets: "3 sets",
        exercises: [
          { name: ":30 skipping" },
          { name: "10 plate GTOH" },
        ],
      },
      {
        type: "SKILL",
        sets: "EMOM 5",
        exercises: [
          { name: "1 rope climb - legless/seated start/regular/footwork only" },
        ],
      },
      {
        type: "WOD",
        wodName: "EMOM 24",
        wodScoreType: "INTERVAL",
        timeCap: 1440,
        rxWeights: "24/32",
        exercises: [
          { name: "1) 1 seated start rope climb" },
          { name: "2) 50 double unders" },
          { name: "3) 12 Russian KBS (24/32)" },
        ],
      },
      {
        type: "ON RAMP",
        wodName: "EMOM 24",
        wodScoreType: "INTERVAL",
        timeCap: 1440,
        exercises: [
          { name: "1) 2 pulls to stand" },
          { name: "2) 30 single unders" },
          { name: "3) 12 Russian KBS (8/12)" },
        ],
      },
    ],
  },
  // ── FRIDAY 24 APRIL ──
  {
    date: "2026-04-24",
    title: "Friday",
    sections: [
      {
        type: "WARM UP",
        exercises: [
          { name: "p1) 1:00 echo bike (slow) / p2) 1:00 GS" },
          { name: "p1) :40 echo bike (moderate) / p2) :40 tempo air squats" },
          { name: "p1) :20 echo bike (sprint) / p2) :20 squat jumps" },
        ],
      },
      {
        type: "STRENGTH",
        sets: "3 sets",
        exercises: [{ name: "5 back squats" }],
      },
      {
        type: "WOD",
        wodName: "8:00 on // 2:00 off x 3 with a partner",
        wodScoreType: "LOAD",
        rxWeights: "85/120",
        exercises: [
          { name: "800/1000-m echo bike" },
          { name: "400-m medball run" },
          { name: "200-m DB farmers carry (15/22.5)" },
          { name: "max back squats in remaining time at 85/120kg" },
        ],
      },
      {
        type: "ON RAMP",
        wodName: "8:00 on // 2:00 off x 3 with a partner",
        wodScoreType: "LOAD",
        exercises: [
          { name: "600/800-m echo bike" },
          { name: "400-m run" },
          { name: "200-m farmers carry" },
          { name: "max back squats in remaining time at 30/40kg" },
        ],
      },
    ],
  },
];

async function seed() {
  console.log("Seeding CrossFit workouts for 20-24 April 2026...\n");

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
