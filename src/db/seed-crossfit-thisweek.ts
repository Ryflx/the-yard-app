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

// CrossFit programming for week of 11-15 May 2026 (Mon-Fri).
// (Saturday is normally a CrossFit day too at the Yard, but skipped this week — comp.)
const CROSSFIT_WORKOUTS: WorkoutData[] = [
  // ── MONDAY 11 MAY ──
  {
    date: "2026-05-11",
    title: "Partner Grind",
    sections: [
      {
        type: "WARM UP",
        exercises: [
          { name: "P1) 1:00 bike (slow) // P2) down up bar touches" },
          { name: "P1) :40 bike (moderate) // P2) beat swings" },
          { name: "P1) :20 (fast) // P2) 3-5 strict pull ups or 10 ring rows" },
        ],
      },
      {
        type: "STRENGTH",
        sets: "3 sets",
        exercises: [{ name: "5 D-ball squats" }],
      },
      {
        type: "WOD",
        wodScoreType: "INTERVAL",
        timeCap: 1800,
        sets: "8:00 on 2:00 off x 3 with a partner",
        wodName: "Partner Grind",
        exercises: [
          { name: "20 d-ball squats (ball on shoulder) (50/70)" },
          { name: "70/90 cal bike" },
          { name: "max reps C2B pull ups" },
        ],
      },
      {
        type: "ON RAMP",
        sets: "8:00 on 2:00 off x 3 with a partner",
        exercises: [
          { name: "20 d-ball squats (ball on shoulder) (15/20)" },
          { name: "45/60 cal bike" },
          { name: "max reps jumping C2B pull ups" },
        ],
      },
    ],
  },
  // ── TUESDAY 12 MAY ──
  {
    date: "2026-05-12",
    title: "Box & Bell Sprint",
    sections: [
      {
        type: "WARM UP",
        exercises: [
          { name: "1 set: 10 box step overs + 20 mountain climbers" },
          { name: "1 set: 10 box jumps + 10 sampson lunges" },
          { name: "1 set: 10 box jump overs + 10 GSA" },
        ],
      },
      {
        type: "STRENGTH",
        sets: "5 sets - lift every 3:00",
        exercises: [{ name: "2 squat clean and split jerks" }],
      },
      {
        type: "WOD",
        wodScoreType: "ROUNDS_REPS",
        timeCap: 420,
        sets: "AMRAP 7",
        wodName: "Box & Bell Sprint",
        exercises: [
          { name: "8 box jump overs (20/24)" },
          { name: "10 american KBS (16/24)" },
        ],
      },
      {
        type: "ON RAMP",
        sets: "AMRAP 7",
        exercises: [
          { name: "8 box jump overs (3 plates)" },
          { name: "10 Russian KBS (8/12)" },
        ],
      },
    ],
  },
  // ── WEDNESDAY 13 MAY ──
  {
    date: "2026-05-13",
    title: "Wall Walk Grinder",
    sections: [
      {
        type: "WARM UP",
        exercises: [
          { name: "1 set: 2:00 bike" },
          { name: "2 sets: 10 press ups to down dog + 10 swimmers" },
        ],
      },
      {
        type: "SKILL",
        sets: "EMOM 5",
        exercises: [
          { name: "1 wall walk up" },
          { name: "3-5 wall facing HSPUs" },
          { name: "1 wall walk down" },
          { name: "- scale to :10 wall facing HS hold" },
        ],
      },
      {
        type: "WOD",
        wodScoreType: "TIME",
        timeCap: 1800,
        sets: "4 rounds for time",
        wodName: "Wall Walk Grinder",
        exercises: [
          { name: "1600/2000-m bike" },
          { name: "30 alternating DB hang clean to overhead (15/22.5)" },
          { name: "8 wall walks" },
        ],
      },
      {
        type: "ON RAMP",
        sets: "4 rounds for time - cap 30:00",
        exercises: [
          { name: "1200/1600-m bike" },
          { name: "20 alternating DB hang clean to overhead (7.5/10)" },
          { name: "8 inchworm walk outs" },
        ],
      },
    ],
  },
  // ── THURSDAY 14 MAY ──
  {
    date: "2026-05-14",
    title: "Run, Squat, Pull",
    sections: [
      {
        type: "WARM UP",
        exercises: [
          { name: "1 set: 400-m run" },
          { name: "3 sets: 10 PVC pass throughs + 10 90/90s" },
        ],
      },
      {
        type: "STRENGTH",
        sets: "Every 2:00 x 10 rounds",
        exercises: [{ name: "2 hang squat snatches" }],
      },
      {
        type: "WOD",
        wodScoreType: "TIME",
        timeCap: 540,
        sets: "3 rounds for time",
        wodName: "Run, Squat, Pull",
        exercises: [
          { name: "200-m run" },
          { name: "15 overhead squats (35/52.5)" },
          { name: "10 strict pull ups" },
        ],
      },
      {
        type: "ON RAMP",
        sets: "3 rounds for time - cap 9:00",
        exercises: [
          { name: "200-m run" },
          { name: "10 overhead squats (15/20)" },
          { name: "10 banded strict pull ups" },
        ],
      },
    ],
  },
  // ── FRIDAY 15 MAY ──
  {
    date: "2026-05-15",
    title: "Deadlift Climb",
    sections: [
      {
        type: "WARM UP",
        sets: "3 sets",
        exercises: [
          { name: ":40 skipping" },
          { name: "10 plate kang squats" },
          { name: "10 beat swings" },
        ],
      },
      {
        type: "SKILL",
        sets: "EMOM 5",
        exercises: [
          { name: "1 strict TTB" },
          { name: "4 alternating single leg TTB" },
          { name: "3 TTB" },
        ],
      },
      {
        type: "WOD",
        wodScoreType: "INTERVAL",
        timeCap: 1800,
        sets: "Every 3:00 x 10",
        wodName: "Deadlift Climb",
        exercises: [
          { name: "25 double unders" },
          { name: "10 deadlifts (60/90)" },
          { name: "10 TTB" },
          { name: "- add 5 double-unders every round" },
        ],
      },
      {
        type: "ON RAMP",
        sets: "Every 3:00 x 10",
        exercises: [
          { name: "25 single unders" },
          { name: "8 deadlifts (35/50)" },
          { name: "10 hanging knee raises" },
          { name: "- add 5 single-unders every round" },
        ],
      },
    ],
  },
];

async function seed() {
  console.log("Seeding CrossFit workouts for 11-15 May 2026...\n");

  for (const day of CROSSFIT_WORKOUTS) {
    const existing = await db
      .select({ id: workouts.id })
      .from(workouts)
      .where(and(eq(workouts.date, day.date), eq(workouts.classType, "CROSSFIT")));

    if (existing.length > 0) {
      for (const w of existing) {
        await db.delete(workoutSections).where(eq(workoutSections.workoutId, w.id));
        await db.delete(workouts).where(eq(workouts.id, w.id));
      }
      console.log(`  ↻ Replaced existing CrossFit workout on ${day.date}`);
    }

    const [workout] = await db
      .insert(workouts)
      .values({ date: day.date, title: day.title, classType: "CROSSFIT" })
      .returning();

    for (let i = 0; i < day.sections.length; i++) {
      const s = day.sections[i];
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

    const sectionSummary = day.sections.map((s) => s.type).join(" → ");
    console.log(`  ✓ ${day.date} (${day.title}): ${sectionSummary}`);
  }

  console.log("\nDone! 5 CrossFit workouts seeded.");
  process.exit(0);
}

seed();
