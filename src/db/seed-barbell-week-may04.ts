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

const BARBELL_WORKOUTS: DayData[] = [
  // ── TUESDAY 5 MAY ──
  {
    date: "2026-05-05",
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
        liftName: "Power clean + 2 hang power cleans",
        exercises: [
          {
            name: "Power clean + 2 hang power cleans",
            percentageSets: [
              { reps: "1", percentage: 50 },
              { reps: "1", percentage: 60 },
              { reps: "1", percentage: 70 },
              { reps: "6x1", percentage: 75 },
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
  // ── WEDNESDAY 6 MAY ──
  {
    date: "2026-05-06",
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
        liftName: "Power snatch + 2 hang power snatches",
        exercises: [
          {
            name: "Power snatch + 2 hang power snatches",
            percentageSets: [
              { reps: "1", percentage: 50 },
              { reps: "1", percentage: 60 },
              { reps: "1", percentage: 70 },
              { reps: "6x1", percentage: 75 },
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
  // ── THURSDAY 7 MAY ──
  {
    date: "2026-05-07",
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
        liftName: "Front squat + power jerk + split jerk",
        exercises: [
          {
            name: "Front squat + power jerk + split jerk",
            percentageSets: [
              { reps: "1", percentage: 50 },
              { reps: "1", percentage: 60 },
              { reps: "1", percentage: 70 },
              { reps: "6x1", percentage: 75 },
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
  console.log("Seeding barbell workouts for 5-7 May 2026...\n");

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

  console.log("\nDone! 3 barbell workouts seeded.");
  process.exit(0);
}

seed();
