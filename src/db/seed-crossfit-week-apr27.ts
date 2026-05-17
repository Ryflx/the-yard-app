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
  // ── MONDAY 27 APRIL ──
  {
    date: "2026-04-27",
    title: "Monday",
    sections: [
      {
        type: "WARM UP",
        sets: "3 sets",
        exercises: [
          { name: ":30 skipping" },
          { name: "10 banded pass throughs" },
          { name: "10 down ups/burpees" },
        ],
      },
      {
        type: "STRENGTH",
        sets: "1-1-1-1-1",
        exercises: [{ name: "Swiss Bar Bench Press" }],
      },
      {
        type: "WOD",
        wodName: "5 rounds for time",
        wodScoreType: "TIME",
        timeCap: 900,
        rxWeights: "16/24",
        exercises: [
          { name: "50 double unders" },
          { name: "20 Russian KBS (16/24)" },
          { name: "15 burpees" },
        ],
      },
    ],
  },
  // ── TUESDAY 28 APRIL ──
  {
    date: "2026-04-28",
    title: "Tuesday",
    sections: [
      {
        type: "WARM UP",
        sets: "1 set",
        exercises: [
          { name: "10 alternating figure 4 stretch" },
          { name: "100m jog (slow)" },
          { name: "20 calf raises" },
          { name: "100m run (moderate)" },
          { name: "10 squat jumps" },
          { name: "100m sprint (fast)" },
        ],
      },
      {
        type: "WARM UP",
        sets: "1 set",
        exercises: [
          { name: "10 tempo good mornings" },
          { name: "20 front rack openers" },
          { name: "10 tempo front squats" },
        ],
      },
      {
        type: "LOADING UP",
        sets: "5 sets",
        exercises: [{ name: "2 squat cleans" }],
      },
      {
        type: "WOD",
        wodName: "AMRAP 25",
        wodScoreType: "ROUNDS_REPS",
        timeCap: 1500,
        rxWeights: "70/102.5",
        exercises: [
          { name: "600m run" },
          { name: "8 strict pull ups" },
          { name: "2 squat cleans (70/102.5)" },
          { name: "3 front squats (70/102.5)" },
        ],
      },
    ],
  },
  // ── WEDNESDAY 29 APRIL ──
  {
    date: "2026-04-29",
    title: "Wednesday",
    sections: [
      {
        type: "WARM UP",
        sets: "1 set",
        exercises: [
          { name: "1:00 bike (:20s/:20m/:20f)" },
          { name: "30 banded pass throughs" },
          { name: "10 box step ups" },
        ],
      },
      {
        type: "STRENGTH",
        sets: "Every 4:00 x 4",
        exercises: [
          { name: "Accumulate 60s chin over bar hold" },
          { name: "Accumulate 60s ring support hold" },
        ],
      },
      {
        type: "WOD",
        wodName: "Every 3:00 x 7",
        wodScoreType: "INTERVAL",
        timeCap: 1260,
        rxWeights: "24/30",
        exercises: [
          { name: "12/15 cal echo bike" },
          { name: "12 TTB" },
          { name: '9 box jumps (24/30")' },
        ],
      },
    ],
  },
  // ── THURSDAY 30 APRIL ──
  {
    date: "2026-04-30",
    title: "Thursday",
    sections: [
      {
        type: "WARM UP",
        sets: "1 set",
        exercises: [{ name: "400m run (slow)" }],
      },
      {
        type: "WARM UP",
        sets: "2 sets",
        exercises: [
          { name: "10 GSA" },
          { name: "10 swimmers" },
          { name: "10 tall plank rotations" },
        ],
      },
      {
        type: "WARM UP",
        sets: "1 set",
        exercises: [{ name: "200m run (fast)" }],
      },
      {
        type: "LOADING UP",
        sets: "5 sets",
        exercises: [
          { name: "1 snatch (squat or power)" },
          { name: "4 overhead squats" },
        ],
      },
      {
        type: "WOD",
        wodName: "Nancy",
        wodScoreType: "TIME",
        timeCap: 1500,
        rxWeights: "29/43",
        exercises: [
          { name: "400m run" },
          { name: "15 OHS (29/43)" },
        ],
      },
    ],
  },
  // ── FRIDAY 1 MAY ──
  {
    date: "2026-05-01",
    title: "Friday",
    sections: [
      {
        type: "WARM UP",
        sets: "1 set",
        exercises: [
          { name: "30 jumping jacks" },
          { name: "20 mountain climbs" },
          { name: "10 press ups to down dog" },
        ],
      },
      {
        type: "WARM UP",
        sets: "1 set",
        exercises: [
          { name: "15 plate kang squats" },
          { name: "15 plate tempo bent over rows" },
          { name: "15 press ups" },
        ],
      },
      {
        type: "SKILL",
        sets: "EMOM 5",
        exercises: [{ name: "1 rope climb" }],
      },
      {
        type: "WOD",
        wodName: "AMRAP 20",
        wodScoreType: "ROUNDS_REPS",
        timeCap: 1200,
        rxWeights: "50/70",
        exercises: [
          { name: "2 legless rope climbs" },
          { name: "20 press ups" },
          { name: ":30 D-ball hold at waist (50/70)" },
        ],
      },
    ],
  },
  // ── SATURDAY 2 MAY ──
  {
    date: "2026-05-02",
    title: "Saturday",
    sections: [
      {
        type: "WARM UP",
        exercises: [
          { name: "P1) 1:00 bike (slow) / P2) DB good mornings" },
          { name: "P1) :45 bike (moderate) / P2) DB deadlifts" },
          { name: "P1) :30 bike / P2) alternating DB swings" },
        ],
      },
      {
        type: "WOD",
        wodName: "Every 2:00 x 14",
        wodScoreType: "ROUNDS_REPS",
        timeCap: 1680,
        rxWeights: "15/22.5",
        exercises: [
          { name: "400/500m bike" },
          { name: "16 alternating DB snatches (15/22.5)" },
          { name: "max reps bar muscle ups" },
        ],
      },
    ],
  },
];

async function seed() {
  console.log("Seeding CrossFit workouts for 27 April – 2 May 2026...\n");

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

  console.log("\nDone! 6 CrossFit workouts seeded.");
  process.exit(0);
}

seed();
