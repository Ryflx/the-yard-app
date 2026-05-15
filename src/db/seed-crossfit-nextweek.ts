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

// CrossFit programming for week of 18-23 May 2026 (Mon-Sat).
const CROSSFIT_WORKOUTS: WorkoutData[] = [
  // ── MONDAY 18 MAY ──
  {
    date: "2026-05-18",
    title: "Ski, Jump, Sit",
    sections: [
      {
        type: "WARM UP",
        exercises: [
          { name: "3 sets: :30 on / :30 off ski erg" },
          { name: "1 set: 10 box step ups + 10 straight leg sit ups" },
          { name: "1 set: 10 box jumps + 10 sit ups" },
        ],
      },
      {
        type: "WOD",
        wodScoreType: "ROUNDS_REPS",
        sets: "EMOM 45",
        wodName: "Ski, Jump, Sit",
        exercises: [
          { name: "1) 10/12 cal ski" },
          { name: "2) 10 box jumps (20/24) (step down)" },
          { name: "3) 10 sit ups" },
        ],
      },
      {
        type: "ON RAMP",
        sets: "EMOM 45",
        exercises: [
          { name: "1) 8/10 cal ski" },
          { name: "2) 8 box jumps (3 plates) (step down)" },
          { name: "3) 8 sit ups" },
        ],
      },
    ],
  },
  // ── TUESDAY 19 MAY ──
  {
    date: "2026-05-19",
    title: "Grace",
    sections: [
      {
        type: "WARM UP",
        exercises: [
          { name: "1 set: 2 lengths GSA + 2 lengths Sampson lunge + 2 lengths bear crawl + 2 lengths broad jump" },
        ],
      },
      {
        type: "STRENGTH",
        sets: "5 sets - lift every 3:00",
        exercises: [{ name: "1 clean and jerk" }],
      },
      {
        type: "WOD",
        wodScoreType: "TIME",
        timeCap: 720,
        sets: "for time",
        wodName: "Grace",
        rxWeights: "43/61kg",
        exercises: [{ name: "30 clean and jerks (43/61)" }],
      },
    ],
  },
  // ── WEDNESDAY 20 MAY ──
  {
    date: "2026-05-20",
    title: "Run, Thrust, Climb",
    sections: [
      {
        type: "WARM UP",
        exercises: [
          { name: "1 set: 400-m run" },
          { name: "2 sets: 10 hollow rocks + 10 banded pull aparts + 10 scapular pull ups" },
        ],
      },
      {
        type: "SKILL",
        sets: "EMOM 5",
        exercises: [{ name: "1-3 bar muscle ups" }],
      },
      {
        type: "WOD",
        wodScoreType: "TIME",
        timeCap: 1560,
        sets: "for time",
        wodName: "Run, Thrust, Climb",
        exercises: [
          { name: "3 km run" },
          { name: "100 thrusters (15/20)" },
          { name: "30 bar muscle ups" },
        ],
      },
      {
        type: "ON RAMP",
        sets: "for time - cap 26:00",
        exercises: [
          { name: "2 km run" },
          { name: "100 air squats" },
          { name: "20 burpee pull ups" },
        ],
      },
    ],
  },
  // ── THURSDAY 21 MAY ──
  {
    date: "2026-05-21",
    title: "Strict Pull Ladder",
    sections: [
      {
        type: "WARM UP",
        exercises: [
          { name: "1 set: :30 single unders + 10 good mornings" },
          { name: "1 set: :30 5:1s + 10 deadstop KBS" },
          { name: "1 set: :30 1:1s + 10 Russian KBS" },
          { name: "1 set: :30 double unders + 10 American KBS" },
        ],
      },
      {
        type: "STRENGTH",
        sets: "Every 2:00 x 10 rounds",
        exercises: [{ name: "2 power snatches" }],
      },
      {
        type: "WOD",
        wodScoreType: "TIME",
        timeCap: 900,
        sets: "for time",
        wodName: "Strict Pull Ladder",
        exercises: [
          { name: "10-8-6-4-2 strict pull ups" },
          { name: "- after each round: 30 double-unders + 10 American KBS (16/24)" },
        ],
      },
    ],
  },
  // ── FRIDAY 22 MAY ──
  {
    date: "2026-05-22",
    title: "R.A.D Acid Athletics",
    sections: [
      {
        type: "WARM UP",
        exercises: [
          { name: "1 set: 10 shuttle runs" },
          { name: "2 sets: 10 GSA + 10 med-ball push press to target" },
          { name: "1 set: 1:00 ski (:20 slow, :20 mod, :20 fast)" },
          { name: "- work in pairs, one starts on shuttle runs, one starts on ski" },
        ],
      },
      {
        type: "SKILL",
        sets: "EMOM 6",
        exercises: [{ name: "1 seated start rope climb" }],
      },
      {
        type: "WOD",
        wodScoreType: "TIME",
        timeCap: 600,
        sets: "for time",
        wodName: "R.A.D Acid Athletics",
        exercises: [
          { name: "10 shuttle runs (50ft)" },
          { name: "50 wall ball shots (6/9)" },
          { name: "10 shuttle runs" },
          { name: "40/50 cal ski erg" },
        ],
      },
    ],
  },
  // ── SATURDAY 23 MAY ──
  {
    date: "2026-05-23",
    title: "Hybrid Deadlift Sprint",
    sections: [
      {
        type: "WARM UP",
        exercises: [
          { name: "1 set: 400-m run" },
          { name: "2 sets: 10 barbell good mornings + 10 down ups" },
        ],
      },
      {
        type: "LOADING UP",
        sets: "5 sets",
        exercises: [{ name: "3 hybrid deadlifts" }],
      },
      {
        type: "WOD",
        wodScoreType: "ROUNDS_REPS",
        timeCap: 1800,
        sets: "9:00 on / 1:00 off with a partner x 3",
        wodName: "Hybrid Deadlift Sprint",
        rxWeights: "95/130kg",
        exercises: [
          { name: "800-m med ball run (split into 200-m)" },
          { name: "45 synchronised over the bar burpees" },
          { name: "max hybrid deadlifts in remaining time at 95/130kg" },
          { name: "- score is total reps" },
        ],
      },
      {
        type: "ON RAMP",
        sets: "9:00 on / 1:00 off with a partner x 3",
        exercises: [
          { name: "800-m run (split into 200-m)" },
          { name: "30 synchronised over the bar burpees" },
          { name: "max hybrid deadlifts in remaining time at 35/50kg" },
          { name: "- score is total reps" },
        ],
      },
    ],
  },
];

async function seed() {
  console.log("Seeding CrossFit workouts for 18-23 May 2026...\n");

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

  console.log(`\nDone! ${CROSSFIT_WORKOUTS.length} CrossFit workouts seeded.`);
  process.exit(0);
}

seed();
