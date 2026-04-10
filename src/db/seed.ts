import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
import { workouts, workoutSections } from "./schema";
import type { SectionExercise } from "./schema";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

interface SectionData {
  type: string;
  sets?: string;
  liftName?: string;
  exercises: SectionExercise[];
}

interface DayData {
  date: string;
  title: string;
  sections: SectionData[];
}

const dummyWeek: DayData[] = [
  {
    date: "2025-04-07",
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
          { name: "3 muscle cleans" },
          { name: "3 front squats" },
        ],
      },
      {
        type: "OLYMPIC LIFT",
        liftName: "Squat clean",
        exercises: [
          {
            name: "Squat clean",
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
          { name: "6 back squats" },
          { name: "12 walking lunges" },
        ],
      },
      {
        type: "STRENGTH 2",
        sets: "3 sets",
        exercises: [
          { name: "12 press ups" },
          { name: "12 DB bench press" },
        ],
      },
    ],
  },
  {
    date: "2025-04-08",
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
              { reps: "5x1", percentage: 80 },
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
  {
    date: "2025-04-09",
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
              { reps: "5x1", percentage: 80 },
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
  {
    date: "2025-04-10",
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
              { reps: "5x1", percentage: 80 },
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
  {
    date: "2025-04-11",
    title: "Friday",
    sections: [
      {
        type: "WARM UP",
        exercises: [{ name: "PVC + Squat drills" }],
      },
      {
        type: "PRIMER",
        sets: "3 sets",
        exercises: [
          { name: "3 tall cleans" },
          { name: "3 front squats" },
        ],
      },
      {
        type: "OLYMPIC LIFT",
        liftName: "Power clean + hang squat clean",
        exercises: [
          {
            name: "Power clean + hang squat clean",
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
          { name: "8 deficit deadlifts" },
          { name: "12 hip thrusts" },
        ],
      },
      {
        type: "STRENGTH 2",
        sets: "3 sets",
        exercises: [
          { name: "8 strict press" },
          { name: "12 lateral raises" },
        ],
      },
    ],
  },
];

async function seed() {
  console.log("Seeding database...");

  for (const day of dummyWeek) {
    const [workout] = await db
      .insert(workouts)
      .values({ date: day.date, title: day.title })
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

    console.log(`  Seeded ${day.title} (${day.date})`);
  }

  console.log("Done!");
}

seed().catch(console.error);
