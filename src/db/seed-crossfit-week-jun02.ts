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
  // ── TUESDAY 2 JUNE ──
  {
    date: "2026-06-02",
    title: "Tuesday",
    sections: [
      {
        type: "WARM UP",
        sets: "3 sets",
        exercises: [
          { name: ":30 skipping" },
          { name: "10 banded pass throughs" },
          { name: "10 press ups to downdog" },
        ],
      },
      {
        type: "STRENGTH",
        sets: "5 sets",
        exercises: [
          { name: "1 clean" },
          { name: "1 strict presses" },
          { name: "2 strict press" },
        ],
      },
      {
        type: "WOD",
        wodName: "AMRAP 15",
        wodScoreType: "ROUNDS_REPS",
        timeCap: 900,
        rxWeights: "35/52.5",
        exercises: [
          { name: "5 strict presses (35/52.5)" },
          { name: "30 double unders" },
          { name: "10 push presses" },
          { name: "30 double unders" },
        ],
      },
      {
        type: "ON RAMP",
        wodName: "AMRAP 15",
        wodScoreType: "ROUNDS_REPS",
        timeCap: 900,
        rxWeights: "15/20",
        exercises: [
          { name: "5 strict presses (15/20)" },
          { name: "30 double unders" },
          { name: "10 push presses" },
          { name: "30 double unders" },
        ],
      },
    ],
  },
  // ── WEDNESDAY 3 JUNE ──
  {
    date: "2026-06-03",
    title: "Wednesday",
    sections: [
      {
        type: "WARM UP",
        sets: "3 sets",
        exercises: [{ name: ":30 on // :30 off ski erg" }],
      },
      {
        type: "WARM UP",
        sets: "2 sets",
        exercises: [
          { name: "10 barbell bent over rows (empty bar)" },
          { name: "10 scapular pull ups" },
        ],
      },
      {
        type: "STRENGTH",
        sets: "5 sets",
        exercises: [
          { name: "6 barbell bent over rows" },
          { name: "max length chin over bar hold (max 1:00)" },
          { name: "- 1:30 rest between rounds" },
        ],
      },
      {
        type: "WOD",
        wodName: "3 rounds for time",
        wodScoreType: "TIME",
        timeCap: 900,
        rxWeights: "24/32",
        exercises: [
          { name: "400/500-m ski" },
          { name: "21 Russian KBS (24/32)" },
          { name: "12 strict pull ups" },
        ],
      },
      {
        type: "ON RAMP",
        wodName: "3 rounds for time",
        wodScoreType: "TIME",
        timeCap: 900,
        rxWeights: "8/12",
        exercises: [
          { name: "300/400-m ski" },
          { name: "21 Russian KBS (8/12)" },
          { name: "12 ring rows" },
        ],
      },
    ],
  },
  // ── THURSDAY 4 JUNE ──
  {
    date: "2026-06-04",
    title: "Thursday",
    sections: [
      {
        type: "WARM UP",
        sets: "1 set",
        exercises: [{ name: "400-m run" }],
      },
      {
        type: "WARM UP",
        sets: "2 sets",
        exercises: [
          { name: ":30 ski" },
          { name: ":30 med ball squats" },
        ],
      },
      {
        type: "WOD",
        wodName: "EVERY 5:00 x 8",
        wodScoreType: "INTERVAL",
        timeCap: 2400,
        exercises: [
          { name: "1) 800-m run" },
          { name: "2) 200-m ski, 25 wall ball shots, 6 rope climbs" },
        ],
      },
      {
        type: "ON RAMP",
        wodName: "EVERY 5:00 x 8",
        wodScoreType: "INTERVAL",
        timeCap: 2400,
        exercises: [
          { name: "1) 600-m run" },
          { name: "2) 200-m ski, 25 wall ball shots, 6 rope climbs" },
        ],
      },
    ],
  },
  // ── FRIDAY 5 JUNE ──
  {
    date: "2026-06-05",
    title: "Friday",
    sections: [
      {
        type: "WARM UP",
        sets: "1 set",
        exercises: [
          { name: "30 jumping jacks" },
          { name: "20 mountain climbers" },
          { name: "10 box step overs" },
          { name: "5 box jump overs" },
        ],
      },
      {
        type: "WARM UP",
        sets: "2 sets",
        exercises: [
          { name: "10 banded pass throughs" },
          { name: "10 banded pull aparts" },
          { name: "10 banded pulls together" },
        ],
      },
      {
        type: "SKILL",
        sets: "EMOM 6",
        exercises: [{ name: "1-3 bar muscle ups" }],
      },
      {
        type: "WOD",
        wodName: "1:00 on // 1:00 off x 10",
        wodScoreType: "ROUNDS_REPS",
        timeCap: 1200,
        exercises: [
          { name: "12 box jump overs (20/24)" },
          { name: "max bar muscle ups" },
        ],
      },
      {
        type: "ON RAMP",
        wodName: "1:00 on // 1:00 off x 10",
        wodScoreType: "ROUNDS_REPS",
        timeCap: 1200,
        exercises: [
          { name: "10 box jump overs (3 plates)" },
          { name: "max jumping bar muscle ups" },
        ],
      },
    ],
  },
  // ── SATURDAY 6 JUNE ──
  {
    date: "2026-06-06",
    title: "Saturday",
    sections: [
      {
        type: "WARM UP",
        sets: "1 set",
        exercises: [{ name: "400-m run" }],
      },
      {
        type: "WARM UP",
        sets: "2 sets",
        exercises: [
          { name: "10 GSA" },
          { name: "5 inchworm press ups" },
        ],
      },
      {
        type: "WARM UP",
        sets: "2 sets",
        exercises: [
          { name: "10 single arm DB thrusters (5/5)" },
          { name: "2 partial wall walks" },
        ],
      },
      {
        type: "WOD",
        wodName: "5:00 on // 1:00 off x 7 in pairs",
        wodScoreType: "ROUNDS_REPS",
        timeCap: 2520,
        rxWeights: "15/22.5",
        exercises: [
          { name: "400-m run (together)" },
          { name: "AMRAP in remaining time" },
          { name: "18 double DB thrusters (15/22.5)" },
          { name: "6 wall walks" },
          { name: "- start the next AMRAP where you left off" },
        ],
      },
      {
        type: "ON RAMP",
        wodName: "5:00 on // 1:00 off x 7 in pairs",
        wodScoreType: "ROUNDS_REPS",
        timeCap: 2520,
        rxWeights: "5/7.5",
        exercises: [
          { name: "400-m run (together)" },
          { name: "AMRAP in remaining time" },
          { name: "18 double DB thrusters (5/7.5)" },
          { name: "6 partial wall walks" },
          { name: "- start the next AMRAP where you left off" },
        ],
      },
    ],
  },
];

async function seed() {
  console.log("Seeding CrossFit workouts for 2-6 June 2026...\n");

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

  console.log(`\nDone! ${CROSSFIT_WORKOUTS.length} CrossFit workouts seeded.`);
  process.exit(0);
}

seed();
