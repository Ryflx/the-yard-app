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
  // ── MONDAY 7 APRIL ──
  {
    date: "2026-04-07",
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
          { name: "3 clean pulls" },
          { name: "3 hip cleans" },
        ],
      },
      {
        type: "OLYMPIC LIFT",
        liftName: "Power clean + hang squat clean",
        exercises: [
          {
            name: "Clean pull + hang squat clean",
            percentageSets: [
              { reps: "1", percentage: 50 },
              { reps: "1", percentage: 60 },
              { reps: "1", percentage: 70 },
              { reps: "1", percentage: 75 },
              { reps: "1", percentage: 80 },
              { reps: "4x1", percentage: 85 },
            ],
          },
        ],
      },
      {
        type: "STRENGTH 1",
        sets: "3 sets",
        exercises: [
          { name: "6 back squats" },
          { name: ":20 echo bike sprint" },
        ],
      },
      {
        type: "STRENGTH 2",
        sets: "3 sets",
        exercises: [
          { name: "10 double DB push press" },
          { name: "10 double DB bench press" },
          { name: "10 double DB floor press" },
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
        exercises: [{ name: "PVC + Squat drills" }],
      },
      {
        type: "PRIMER",
        sets: "3 sets",
        exercises: [
          { name: "3 hang power snatch" },
          { name: "3 overhead squats" },
        ],
      },
      {
        type: "OLYMPIC LIFT",
        liftName: "Squat snatch",
        exercises: [
          {
            name: "Squat snatch",
            percentageSets: [
              { reps: "1", percentage: 50 },
              { reps: "1", percentage: 60 },
              { reps: "1", percentage: 70 },
              { reps: "1", percentage: 75 },
              { reps: "1", percentage: 80 },
              { reps: "4x1", percentage: 85 },
            ],
          },
        ],
      },
      {
        type: "STRENGTH 1",
        sets: "3 sets",
        exercises: [
          { name: "6 tempo sumo RDLs (3X11)" },
          { name: "8 RDLs" },
        ],
      },
      {
        type: "STRENGTH 2",
        sets: "3 sets",
        exercises: [
          { name: "6 pendalay rows" },
          { name: "12 ring rows" },
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
        exercises: [{ name: "PVC + Squat drills" }],
      },
      {
        type: "PRIMER",
        sets: "3 sets",
        exercises: [
          { name: "3 front squats" },
          { name: "2 push jerks" },
          { name: "1 split jerk" },
        ],
      },
      {
        type: "OLYMPIC LIFT",
        liftName: "Squat clean + split jerk",
        exercises: [
          {
            name: "Squat clean + split jerk",
            percentageSets: [
              { reps: "1", percentage: 50 },
              { reps: "1", percentage: 60 },
              { reps: "1", percentage: 70 },
              { reps: "1", percentage: 75 },
              { reps: "1", percentage: 80 },
              { reps: "4x1", percentage: 85 },
            ],
          },
        ],
      },
      {
        type: "STRENGTH 1",
        sets: "3 sets",
        exercises: [
          { name: "12 zercher lunges (6/6)" },
          { name: "6 zercher squats" },
        ],
      },
      {
        type: "STRENGTH 2",
        sets: "3 sets",
        exercises: [
          { name: "12 press ups" },
          { name: "3 wall walks" },
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
        exercises: [{ name: "PVC + Squat drills" }],
      },
      {
        type: "PRIMER",
        sets: "3 sets",
        exercises: [
          { name: "3 snatch pulls" },
          { name: "3 hip snatches" },
        ],
      },
      {
        type: "OLYMPIC LIFT",
        liftName: "Snatch pull + hang squat snatch",
        exercises: [
          {
            name: "Snatch pull + hang squat snatch",
            percentageSets: [
              { reps: "1", percentage: 50 },
              { reps: "1", percentage: 60 },
              { reps: "1", percentage: 70 },
              { reps: "1", percentage: 75 },
              { reps: "1", percentage: 80 },
              { reps: "4x1", percentage: 85 },
            ],
          },
        ],
      },
      {
        type: "STRENGTH 1",
        sets: "3 sets",
        exercises: [
          { name: "6 double KB/DB russian swings" },
          { name: "12 single KB american swings" },
        ],
      },
      {
        type: "STRENGTH 2",
        sets: "3 sets",
        exercises: [
          { name: ":20 chin over bar hold" },
          { name: "6 strict pull ups" },
          { name: ":10 chin over bar hold" },
        ],
      },
    ],
  },
];

async function seed() {
  console.log("Seeding barbell workouts for 7-10 April 2026...\n");

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
