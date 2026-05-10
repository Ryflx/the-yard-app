import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "./index";
import { workouts, workoutSections } from "./schema";
import { eq, and } from "drizzle-orm";
import type { SectionExercise, WorkoutSectionType } from "./schema";

interface SectionData {
  type: WorkoutSectionType;
  sets?: string;
  liftName?: string;
  exercises: SectionExercise[];
}

interface DayData {
  date: string;
  title: string;
  sections: SectionData[];
}

// Barbell programming for week of 11-14 May 2026 (Mon-Thu — Yard's Barbell class never runs Fri).
const BARBELL_WORKOUTS: DayData[] = [
  // ── MONDAY 11 MAY ──
  {
    date: "2026-05-11",
    title: "Monday",
    sections: [
      {
        type: "WARM UP",
        exercises: [{ name: "PVC + Squat drills" }],
      },
      {
        type: "PRIMER",
        sets: "3 sets",
        exercises: [
          { name: "3 muscle snatches" },
          { name: "3 overhead squats" },
        ],
      },
      {
        type: "OLYMPIC LIFT",
        liftName: "Hang snatch + hang snatch + snatch",
        exercises: [
          {
            name: "1 hang snatch (mid thigh) + 1 hang snatch (below knee) + 1 snatch",
            percentageSets: [
              { reps: "1", percentage: 50 },
              { reps: "1", percentage: 60 },
              { reps: "1", percentage: 70 },
              { reps: "1", percentage: 75 },
              { reps: "5x1", percentage: 80 },
            ],
          },
        ],
      },
      {
        type: "STRENGTH 1",
        sets: "3 sets",
        exercises: [
          { name: "3 snatch pulls (heavy)" },
          { name: "9 snatch grip RDLs" },
          { name: "- use straps if possible" },
        ],
      },
      {
        type: "STRENGTH 2",
        sets: "3 sets",
        exercises: [
          { name: "6 strict pull ups" },
          { name: "8 single arm bench supported bent over rows /side" },
        ],
      },
    ],
  },
  // ── TUESDAY 12 MAY ──
  {
    date: "2026-05-12",
    title: "Tuesday",
    sections: [
      {
        type: "WARM UP",
        exercises: [{ name: "PVC + Squat drills" }],
      },
      {
        type: "PRIMER",
        sets: "3 sets",
        exercises: [{ name: "3 muscle cleans" }],
      },
      {
        type: "OLYMPIC LIFT",
        liftName: "Clean pull + hang power clean + hang clean",
        exercises: [
          {
            name: "1 clean pull + 1 hang power clean + 1 hang clean",
            percentageSets: [
              { reps: "1", percentage: 50 },
              { reps: "1", percentage: 60 },
              { reps: "1", percentage: 70 },
              { reps: "1", percentage: 75 },
              { reps: "5x1", percentage: 80 },
            ],
          },
        ],
      },
      {
        type: "STRENGTH 1",
        sets: "3 sets",
        exercises: [
          { name: "6x 1+1/4 front squats" },
          { name: "12 alternating jumping lunges" },
        ],
      },
      {
        type: "STRENGTH 2",
        sets: "3 sets",
        exercises: [
          { name: "6 double KB seated press" },
          { name: "10 deficit press ups (1 plate)" },
        ],
      },
    ],
  },
  // ── WEDNESDAY 13 MAY ──
  {
    date: "2026-05-13",
    title: "Wednesday",
    sections: [
      {
        type: "WARM UP",
        exercises: [{ name: "PVC + Squat drills" }],
      },
      {
        type: "PRIMER",
        sets: "3 sets",
        exercises: [{ name: "3 muscle snatches" }],
      },
      {
        type: "OLYMPIC LIFT",
        liftName: "Snatch pull + hang power snatch + hang snatch",
        exercises: [
          {
            name: "1 snatch pull + 1 hang power snatch + 1 hang snatch",
            percentageSets: [
              { reps: "1", percentage: 50 },
              { reps: "1", percentage: 60 },
              { reps: "1", percentage: 70 },
              { reps: "1", percentage: 75 },
              { reps: "5x1", percentage: 80 },
            ],
          },
        ],
      },
      {
        type: "STRENGTH 1",
        sets: "3 sets",
        exercises: [
          { name: "4-6 barbell bent over rows (heavy)" },
          { name: "max chin ups (2 reps in reserve)" },
        ],
      },
      {
        type: "STRENGTH 2",
        sets: "3 sets",
        exercises: [
          { name: "8 double DB swings" },
          { name: "4 devils press" },
        ],
      },
    ],
  },
  // ── THURSDAY 14 MAY ──
  {
    date: "2026-05-14",
    title: "Thursday",
    sections: [
      {
        type: "WARM UP",
        exercises: [{ name: "PVC + Squat drills" }],
      },
      {
        type: "PRIMER",
        sets: "3 sets",
        exercises: [{ name: "3 split jerk balances" }],
      },
      {
        type: "OLYMPIC LIFT",
        liftName: "Front squat + split jerk",
        exercises: [
          {
            name: "2 front squats + 1 split jerk",
            percentageSets: [
              { reps: "1", percentage: 50 },
              { reps: "1", percentage: 60 },
              { reps: "1", percentage: 70 },
              { reps: "1", percentage: 75 },
              { reps: "5x1", percentage: 80 },
            ],
          },
        ],
      },
      {
        type: "STRENGTH 1",
        sets: "3 sets",
        exercises: [
          { name: "12 squat jumps" },
          { name: "6 d-ball squats (ball on chest)" },
        ],
      },
      {
        type: "STRENGTH 2",
        sets: "3 sets",
        exercises: [
          { name: "6 double DB push press" },
          { name: "6 strict ring dips" },
        ],
      },
    ],
  },
];

async function seed() {
  console.log("Seeding barbell workouts for 11-14 May 2026...\n");

  for (const day of BARBELL_WORKOUTS) {
    const existing = await db
      .select({ id: workouts.id })
      .from(workouts)
      .where(and(eq(workouts.date, day.date), eq(workouts.classType, "BARBELL")));

    if (existing.length > 0) {
      for (const w of existing) {
        await db.delete(workoutSections).where(eq(workoutSections.workoutId, w.id));
        await db.delete(workouts).where(eq(workouts.id, w.id));
      }
      console.log(`  ↻ Replaced existing barbell workout on ${day.date}`);
    }

    const [workout] = await db
      .insert(workouts)
      .values({ date: day.date, title: day.title, classType: "BARBELL" })
      .returning();

    for (let i = 0; i < day.sections.length; i++) {
      const section = day.sections[i];
      await db.insert(workoutSections).values({
        workoutId: workout.id,
        type: section.type,
        sortOrder: i,
        liftName: section.liftName ?? null,
        sets: section.sets ?? null,
        exercises: section.exercises,
      });
    }

    const lift = day.sections.find((s) => s.type === "OLYMPIC LIFT")?.liftName;
    console.log(`  ✓ ${day.date} (${day.title}): ${lift}`);
  }

  console.log("\nDone! 4 barbell workouts seeded.");
  process.exit(0);
}

seed();
