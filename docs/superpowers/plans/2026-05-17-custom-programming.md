# Custom Programming Track — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `CUSTOM` programming track inside barbell-tracker that ingests the WODprep skill library, interviews the user, infers weaknesses from their logged data, generates a hybrid (rules + Claude) 8-week skill plan woven around existing classes, and announces itself to existing users via a generalised tour module.

**Architecture:** Three subsystems isolated by file boundary — Skill Library (read-side, DB-backed catalogue of 27 WODprep courses), Plan Generator (write-side, deterministic scheduler + Claude personalisation pass, persisted as `workouts` rows), Calendar Integration (renders `CUSTOM` workouts on the existing `/schedule` + `/workout/[date]` pages via the existing `classType` discriminator). A small refactor of the onboarding tour component generalises it to multiple tour modules with versioned per-user tracking.

**Tech Stack:** Next.js 16.2.3 (app router), React 19, Neon serverless Postgres + Drizzle ORM 0.45 (drizzle-kit push, no migration files), Clerk auth, `@anthropic-ai/sdk` 0.88 (`claude-haiku-4-5-20251001`), shadcn/ui + Tailwind v4, Vitest (tests co-located as `*.test.ts` in `src/**`, NOT in `__tests__/`).

**IMPORTANT — Next.js is non-standard:** Per `AGENTS.md`, this version has breaking changes from the Next.js you may know. **Before writing any new route, server action, or `page.tsx`, read the relevant guide in `node_modules/next/dist/docs/`.** Heed deprecation notices. Match patterns already in the codebase.

**Spec:** [`docs/superpowers/specs/2026-05-17-custom-programming-design.md`](../specs/2026-05-17-custom-programming-design.md)

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `data/skill-library/*.json` (27 files) | WODprep course content, copied from `~/dev/personal/training-calendar/data/drills/` |
| `data/skill-library/curation.ts` | Hand-curated metadata overlay (category, difficulty, estimated minutes, drills/week, prereq slug) |
| `src/db/seed-skill-library.ts` | Idempotent ingest script (TS, run via `npx tsx`) |
| `src/lib/programming/types.ts` | Shared types (`WeaknessSignal`, `LLMPersonalisation`, `DraftSession`, `WeeklySlot`, `TourId`) |
| `src/lib/programming/movement-patterns.ts` | Regex classifier — movement strings → `MovementPattern[]` |
| `src/lib/programming/movement-patterns.test.ts` | Tests for the classifier |
| `src/lib/programming/weakness.ts` | SQL + rules: derive `WeaknessSignal[]` from `user_lift_logs` and `wod_results` |
| `src/lib/programming/weakness.test.ts` | Tests with fixture rows |
| `src/lib/programming/scheduler.ts` | Pass 1: rules-based placement of drill candidates into user slots, conflict-aware |
| `src/lib/programming/scheduler.test.ts` | Tests for round-robin, conflict detection, unplaceable reporting |
| `src/lib/programming/validator.ts` | Pure validation of an `LLMPersonalisation` object against hard constraints |
| `src/lib/programming/validator.test.ts` | Tests for every reject path |
| `src/lib/programming/personalise.ts` | Pass 2: build prompt, call Claude, parse + validate, return personalised plan or fallback |
| `src/lib/programming/tour.ts` | Pure helper: `pickNextTour(seen, onboardingComplete)` |
| `src/lib/programming/tour.test.ts` | Tests for precedence |
| `src/components/custom-drill-detail.tsx` | Drill detail view (used in `/workout/[date]`) |
| `src/components/programming/wizard.tsx` | Wizard state machine + step orchestrator |
| `src/components/programming/wizard-step-1-starting-point.tsx` | Step 1 UI |
| `src/components/programming/wizard-step-2-skills.tsx` | Step 2 UI (with weakness suggestions) |
| `src/components/programming/wizard-step-3-slots.tsx` | Step 3 UI (week-grid slot picker) |
| `src/components/programming/wizard-step-4-length.tsx` | Step 4 UI (fixed 8 weeks) |
| `src/components/programming/wizard-step-5-review.tsx` | Step 5 UI (preview + commit) |
| `src/components/programming/active-plan-overview.tsx` | `/programming` overview render |
| `src/components/programming/swap-drill-sheet.tsx` | Swap-this-session bottom sheet |
| `src/app/(app)/programming/page.tsx` | Active-plan overview route |
| `src/app/(app)/programming/new/page.tsx` | Wizard route |
| `src/app/(app)/programming/skills/[slug]/page.tsx` | Read-only course browse |

### Modified files

| Path | Change |
|---|---|
| `src/db/schema.ts` | Add `CUSTOM` to `ClassType` union; add 4 new tables (`skillCourses`, `skillDrills`, `customPlans`, `customPlanSessions`, `goalQuestionnaires`); add `seenTourModules` column to `userProfiles` |
| `src/app/actions.ts` | Add 8 new server actions; rename `completeOnboarding` internals to wrap `markTourSeen('onboarding-v1')` |
| `src/components/class-type-tabs.tsx` | Add `CUSTOM` to `CLASS_TYPES`; add `data-tour="class-tabs-custom"` to the CUSTOM tab |
| `src/app/(app)/workout/[date]/page.tsx` | Add `CustomDrillDetail` branch alongside `BarbellDetail` / `CrossFitDetail`; fetch `custom_plan_sessions` join |
| `src/components/onboarding-tour.tsx` | Refactor `STEPS` array → `TOURS` map; accept `tourId` prop; call `markTourSeen(tourId)` on finish |
| `src/app/(app)/schedule/page.tsx` | Replace single boolean check with `pickNextTour(...)`; render `<OnboardingTour tourId={nextTour} />` |

---

## Conventions used throughout

- **Run a single test:** `npx vitest run src/lib/programming/<file>.test.ts -t "<test name>"`
- **Run all tests:** `npx vitest run`
- **Push schema changes:** `npx drizzle-kit push`
- **Run a seed script:** `npx tsx src/db/<file>.ts`
- **Commit cadence:** one commit per task. Use the message specified in the task's final step.
- **Code style:** 2-space indent, double-quoted strings, no semicolons at end of object literals, matches existing files.
- **Auth pattern in server actions:** `const { userId } = await auth(); if (!userId) throw new Error("Not authenticated");`
- **After every mutation:** call `revalidatePath()` on touched routes.

---

# Phase A — Schema, ingest, and CUSTOM track skeleton

## Task 1: Schema — add skill library tables

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Add `skillCourses` and `skillDrills` table definitions**

Append after the existing `userExerciseSubstitutions` table (around line 203) in `src/db/schema.ts`:

```ts
export type SkillCategory =
  | "jump_rope"
  | "gymnastics_pull"
  | "handstand"
  | "conditioning"
  | "mobility"
  | "lifting"
  | "weightlifting";

export type MovementPattern =
  | "pull"
  | "press"
  | "overhead"
  | "squat"
  | "hinge"
  | "core"
  | "conditioning"
  | "jump"
  | "unilateral";

export const skillCourses = pgTable("skill_courses", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  sourceUrl: text("source_url").notNull(),
  totalWeeks: integer("total_weeks").notNull(),
  category: text("category").notNull().$type<SkillCategory>(),
  prerequisiteSkillId: integer("prerequisite_skill_id"),
  difficulty: integer("difficulty").notNull(),
  estimatedSessionMinutes: integer("estimated_session_minutes").notNull(),
  drillsPerWeek: integer("drills_per_week").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export interface SkillDrillSectionItem {
  movement: string;
  sets?: number;
  reps?: string | number;
  minute?: number;
  notes?: string;
  has_video?: boolean;
}

export interface SkillDrillSection {
  name: string;
  items: SkillDrillSectionItem[];
}

export const skillDrills = pgTable(
  "skill_drills",
  {
    id: serial("id").primaryKey(),
    courseId: integer("course_id")
      .notNull()
      .references(() => skillCourses.id, { onDelete: "cascade" }),
    week: integer("week").notNull(),
    orderInWeek: integer("order_in_week").notNull(),
    externalId: text("external_id").notNull(),
    title: text("title").notNull(),
    sections: jsonb("sections").$type<SkillDrillSection[]>().notNull(),
    movementsSummary: text("movements_summary").notNull(),
    primaryMovementPatterns: text("primary_movement_patterns").array().notNull().$type<MovementPattern[]>(),
  },
  (t) => [uniqueIndex("skill_drills_unique").on(t.courseId, t.externalId)]
);
```

- [ ] **Step 2: Push schema to Neon**

Run: `npx drizzle-kit push`

Expected output: prompts about creating new tables; accept. No prompts about modifying existing tables.

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat(db): add skill_courses and skill_drills tables"
```

---

## Task 2: Copy WODprep JSONs into the repo

**Files:**
- Create: `data/skill-library/*.json` (27 files)

- [ ] **Step 1: Create the directory and copy all 27 JSON files**

Run:

```bash
mkdir -p data/skill-library
cp ~/dev/personal/training-calendar/data/drills/*.json data/skill-library/
ls data/skill-library/*.json | wc -l
```

Expected: prints `27` (or however many real course files exist — there may be a few `-raw.json` files too; if so, delete them since the seed script reads only the processed shape).

- [ ] **Step 2: Inspect one file to confirm shape**

Read `data/skill-library/double-under-foundations.json` and verify the top-level keys match `skill`, `course_name`, `course_slug`, `source`, `source_url`, `total_weeks`, `total_lessons`, `weeks`. The `weeks[].workouts[].sections[].items[]` path should resolve to drill items.

- [ ] **Step 3: Commit**

```bash
git add data/skill-library/
git commit -m "chore(skill-library): import 27 WODprep course JSONs"
```

---

## Task 3: Curation overlay

**Files:**
- Create: `data/skill-library/curation.ts`

- [ ] **Step 1: Write the curation overlay**

Create `data/skill-library/curation.ts`:

```ts
import type { SkillCategory } from "@/db/schema";

export interface CurationEntry {
  category: SkillCategory;
  difficulty: 1 | 2 | 3 | 4 | 5;
  estimatedSessionMinutes: number;
  drillsPerWeek: number;
  prerequisiteSlug?: string;
}

export const CURATION: Record<string, CurationEntry> = {
  // Jump rope
  "double-under-foundations": { category: "jump_rope", difficulty: 1, estimatedSessionMinutes: 20, drillsPerWeek: 2 },
  "double-under-pro": { category: "jump_rope", difficulty: 3, estimatedSessionMinutes: 25, drillsPerWeek: 2, prerequisiteSlug: "double-under-foundations" },

  // Gymnastics pull
  "bar-muscle-up-mastery": { category: "gymnastics_pull", difficulty: 4, estimatedSessionMinutes: 40, drillsPerWeek: 1 },
  "ring-muscle-up-madness": { category: "gymnastics_pull", difficulty: 4, estimatedSessionMinutes: 40, drillsPerWeek: 1 },
  "kipping-pull-up-performance": { category: "gymnastics_pull", difficulty: 2, estimatedSessionMinutes: 30, drillsPerWeek: 2 },
  "kickass-kip-swing": { category: "gymnastics_pull", difficulty: 2, estimatedSessionMinutes: 25, drillsPerWeek: 2 },
  "strict-pull-up-strength": { category: "gymnastics_pull", difficulty: 3, estimatedSessionMinutes: 30, drillsPerWeek: 2 },
  "butterfly-pull-up-breakthrough": { category: "gymnastics_pull", difficulty: 3, estimatedSessionMinutes: 30, drillsPerWeek: 1, prerequisiteSlug: "kipping-pull-up-performance" },
  "butterfly-pull-up-chest-to-bar": { category: "gymnastics_pull", difficulty: 4, estimatedSessionMinutes: 35, drillsPerWeek: 1, prerequisiteSlug: "butterfly-pull-up-breakthrough" },
  "kipping-pull-up-chest-to-bar": { category: "gymnastics_pull", difficulty: 3, estimatedSessionMinutes: 30, drillsPerWeek: 1, prerequisiteSlug: "kipping-pull-up-performance" },
  "rapid-rope-climbs": { category: "gymnastics_pull", difficulty: 3, estimatedSessionMinutes: 25, drillsPerWeek: 1 },
  "toes-to-bar-transformed": { category: "gymnastics_pull", difficulty: 2, estimatedSessionMinutes: 25, drillsPerWeek: 2 },

  // Handstand
  "handstand-walk-hero": { category: "handstand", difficulty: 4, estimatedSessionMinutes: 30, drillsPerWeek: 2 },
  "handstand-push-up-power": { category: "handstand", difficulty: 3, estimatedSessionMinutes: 30, drillsPerWeek: 2 },
  "confident-kick-ups": { category: "handstand", difficulty: 2, estimatedSessionMinutes: 20, drillsPerWeek: 2 },

  // Conditioning
  "endless-engine": { category: "conditioning", difficulty: 2, estimatedSessionMinutes: 45, drillsPerWeek: 2 },
  "endless-engine-running-only": { category: "conditioning", difficulty: 2, estimatedSessionMinutes: 45, drillsPerWeek: 2 },
  "endless-engine-specific-programming": { category: "conditioning", difficulty: 3, estimatedSessionMinutes: 45, drillsPerWeek: 2 },
  "burpee-blueprint": { category: "conditioning", difficulty: 1, estimatedSessionMinutes: 20, drillsPerWeek: 2 },

  // Mobility / accessory
  "happy-hips": { category: "mobility", difficulty: 1, estimatedSessionMinutes: 15, drillsPerWeek: 3 },
  "functional-core": { category: "mobility", difficulty: 1, estimatedSessionMinutes: 20, drillsPerWeek: 2 },
  "ankle-flexibility": { category: "mobility", difficulty: 1, estimatedSessionMinutes: 15, drillsPerWeek: 3 },
  "shoulderrom-unlocked": { category: "mobility", difficulty: 1, estimatedSessionMinutes: 15, drillsPerWeek: 3 },
  "grip-strength-goals": { category: "mobility", difficulty: 2, estimatedSessionMinutes: 20, drillsPerWeek: 2 },
  "raw-strength": { category: "lifting", difficulty: 3, estimatedSessionMinutes: 45, drillsPerWeek: 2 },

  // Lifting
  "wodprep-weightlifting": { category: "weightlifting", difficulty: 3, estimatedSessionMinutes: 60, drillsPerWeek: 2 },
  "back-squat-strict-press": { category: "lifting", difficulty: 2, estimatedSessionMinutes: 45, drillsPerWeek: 2 },
};
```

> **If the actual slug for any course differs from above:** read the `course_slug` field at the top of each `data/skill-library/*.json` and update the keys here to match. The seed script in Task 6 keys upserts by `slug`, so a mismatch silently inserts a duplicate.

- [ ] **Step 2: Commit**

```bash
git add data/skill-library/curation.ts
git commit -m "feat(skill-library): add curation overlay (difficulty / minutes / pacing)"
```

---

## Task 4: Movement-pattern classifier (TDD)

**Files:**
- Create: `src/lib/programming/movement-patterns.ts`
- Create: `src/lib/programming/movement-patterns.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/programming/movement-patterns.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { classifyMovements } from "./movement-patterns";

describe("classifyMovements", () => {
  it("classifies a ring muscle up as pull + press", () => {
    expect(classifyMovements(["Ring Muscle Up"])).toEqual(expect.arrayContaining(["pull", "press"]));
  });

  it("classifies handstand walk as press + overhead", () => {
    expect(classifyMovements(["Handstand Walk"])).toEqual(expect.arrayContaining(["press", "overhead"]));
  });

  it("classifies double unders as conditioning + jump", () => {
    expect(classifyMovements(["50 Double Unders"])).toEqual(expect.arrayContaining(["conditioning", "jump"]));
  });

  it("classifies toes to bar as pull + core", () => {
    expect(classifyMovements(["Toes To Bar x10"])).toEqual(expect.arrayContaining(["pull", "core"]));
  });

  it("classifies pistol as squat + unilateral", () => {
    expect(classifyMovements(["Pistol Squat"])).toEqual(expect.arrayContaining(["squat", "unilateral"]));
  });

  it("deduplicates patterns across multiple movements", () => {
    const out = classifyMovements(["Ring Muscle Up", "Bar Muscle Up"]);
    expect(out.filter((p) => p === "pull")).toHaveLength(1);
    expect(out.filter((p) => p === "press")).toHaveLength(1);
  });

  it("returns empty array for unmatched movement", () => {
    expect(classifyMovements(["Walk to the bathroom"])).toEqual([]);
  });

  it("matches the EMOM/AMRAP prefix without misclassifying as a movement", () => {
    // "EMOM 10" is structural, not a movement — must not match anything
    expect(classifyMovements(["EMOM 10:"])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/programming/movement-patterns.test.ts`

Expected: FAIL with module-not-found for `./movement-patterns`.

- [ ] **Step 3: Implement the classifier**

Create `src/lib/programming/movement-patterns.ts`:

```ts
import type { MovementPattern } from "@/db/schema";

interface PatternRule {
  match: RegExp;
  patterns: MovementPattern[];
}

const RULES: PatternRule[] = [
  { match: /\b(muscle ?up|mu)\b/i, patterns: ["pull", "press"] },
  { match: /\b(handstand walk|hs walk)\b/i, patterns: ["press", "overhead"] },
  { match: /\b(handstand push ?up|hspu)\b/i, patterns: ["press", "overhead"] },
  { match: /\b(handstand hold|kick ?up|wall walk)\b/i, patterns: ["press", "overhead"] },
  { match: /\b(double under|du)\b/i, patterns: ["conditioning", "jump"] },
  { match: /\b(single under|jump rope)\b/i, patterns: ["conditioning", "jump"] },
  { match: /\b(toes to bar|t2b|ttb)\b/i, patterns: ["pull", "core"] },
  { match: /\b(kipping|butterfly|strict) pull[- ]?up/i, patterns: ["pull"] },
  { match: /\b(pull[- ]?up|chin[- ]?up|c2b|chest to bar)\b/i, patterns: ["pull"] },
  { match: /\b(rope climb)\b/i, patterns: ["pull", "core"] },
  { match: /\b(pistol|single leg squat)\b/i, patterns: ["squat", "unilateral"] },
  { match: /\b(back squat|front squat|overhead squat|air squat)\b/i, patterns: ["squat"] },
  { match: /\b(deadlift|clean pull|snatch pull|rdl)\b/i, patterns: ["hinge"] },
  { match: /\b(clean|snatch|jerk|press|push press|push jerk|thruster)\b/i, patterns: ["press", "overhead"] },
  { match: /\b(plank|hollow|core|sit ?up|v[- ]?up|gh\s*sit)\b/i, patterns: ["core"] },
  { match: /\b(burpee|row|bike|ski|run|jog)\b/i, patterns: ["conditioning"] },
];

export function classifyMovements(movements: string[]): MovementPattern[] {
  const out = new Set<MovementPattern>();
  for (const m of movements) {
    for (const rule of RULES) {
      if (rule.match.test(m)) {
        for (const p of rule.patterns) out.add(p);
      }
    }
  }
  return Array.from(out);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/programming/movement-patterns.test.ts`

Expected: PASS, 8/8.

- [ ] **Step 5: Commit**

```bash
git add src/lib/programming/movement-patterns.ts src/lib/programming/movement-patterns.test.ts
git commit -m "feat(programming): movement pattern classifier"
```

---

## Task 5: Seed script — skill library ingest

**Files:**
- Create: `src/db/seed-skill-library.ts`

- [ ] **Step 1: Write the seed script**

Create `src/db/seed-skill-library.ts`:

```ts
import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "./index";
import { skillCourses, skillDrills, type SkillDrillSection } from "./schema";
import { sql } from "drizzle-orm";
import { CURATION } from "../../data/skill-library/curation";
import { classifyMovements } from "../lib/programming/movement-patterns";

interface ScrapedWorkoutItem {
  movement: string;
  sets?: number;
  reps?: string | number;
  minute?: number;
  notes?: string;
  has_video?: boolean;
}

interface ScrapedWorkoutSection {
  name: string;
  items: ScrapedWorkoutItem[];
}

interface ScrapedWorkout {
  id: string;
  lesson_id?: number;
  title: string;
  url?: string;
  description?: string;
  sections: ScrapedWorkoutSection[];
}

interface ScrapedWeek {
  week: number;
  workouts: ScrapedWorkout[];
}

interface ScrapedCourse {
  skill: string;
  course_name: string;
  course_slug: string;
  source: string;
  source_url: string;
  scraped: string;
  total_weeks: number;
  weeks: ScrapedWeek[];
}

const SKILL_LIBRARY_DIR = path.join(process.cwd(), "data", "skill-library");

async function loadCourses(): Promise<ScrapedCourse[]> {
  const files = await readdir(SKILL_LIBRARY_DIR);
  const jsonFiles = files.filter((f) => f.endsWith(".json") && !f.endsWith("-raw.json"));
  const out: ScrapedCourse[] = [];
  for (const f of jsonFiles) {
    const raw = await readFile(path.join(SKILL_LIBRARY_DIR, f), "utf-8");
    out.push(JSON.parse(raw));
  }
  return out;
}

function movementsSummaryFor(workout: ScrapedWorkout): string {
  const top: string[] = [];
  for (const section of workout.sections) {
    for (const item of section.items) {
      if (item.movement) top.push(item.movement);
      if (top.length >= 5) return top.join(" · ");
    }
  }
  return top.join(" · ");
}

function allMovementsIn(workout: ScrapedWorkout): string[] {
  const out: string[] = [];
  for (const section of workout.sections) {
    for (const item of section.items) if (item.movement) out.push(item.movement);
  }
  return out;
}

async function main() {
  const courses = await loadCourses();
  console.log(`Loaded ${courses.length} courses from ${SKILL_LIBRARY_DIR}`);

  for (const c of courses) {
    const curation = CURATION[c.course_slug];
    if (!curation) {
      console.warn(`  ⚠ skipping ${c.course_slug} — no curation entry`);
      continue;
    }

    // Upsert course
    const [course] = await db
      .insert(skillCourses)
      .values({
        slug: c.course_slug,
        name: c.course_name,
        source: c.source,
        sourceUrl: c.source_url,
        totalWeeks: c.total_weeks,
        category: curation.category,
        difficulty: curation.difficulty,
        estimatedSessionMinutes: curation.estimatedSessionMinutes,
        drillsPerWeek: curation.drillsPerWeek,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: skillCourses.slug,
        set: {
          name: c.course_name,
          totalWeeks: c.total_weeks,
          category: curation.category,
          difficulty: curation.difficulty,
          estimatedSessionMinutes: curation.estimatedSessionMinutes,
          drillsPerWeek: curation.drillsPerWeek,
          updatedAt: new Date(),
        },
      })
      .returning();

    let drillCount = 0;
    for (const week of c.weeks) {
      let order = 0;
      for (const workout of week.workouts) {
        order += 1;
        const movements = allMovementsIn(workout);
        await db
          .insert(skillDrills)
          .values({
            courseId: course.id,
            week: week.week,
            orderInWeek: order,
            externalId: workout.id,
            title: workout.title,
            sections: workout.sections as SkillDrillSection[],
            movementsSummary: movementsSummaryFor(workout),
            primaryMovementPatterns: classifyMovements(movements),
          })
          .onConflictDoUpdate({
            target: [skillDrills.courseId, skillDrills.externalId],
            set: {
              title: workout.title,
              sections: workout.sections as SkillDrillSection[],
              movementsSummary: movementsSummaryFor(workout),
              primaryMovementPatterns: classifyMovements(movements),
              week: week.week,
              orderInWeek: order,
            },
          });
        drillCount += 1;
      }
    }

    console.log(`  ✓ ${c.course_slug} — ${drillCount} drills`);
  }

  // Resolve prerequisites in a second pass (slugs → ids)
  for (const [slug, entry] of Object.entries(CURATION)) {
    if (!entry.prerequisiteSlug) continue;
    await db.execute(sql`
      UPDATE skill_courses
      SET prerequisite_skill_id = (SELECT id FROM skill_courses WHERE slug = ${entry.prerequisiteSlug})
      WHERE slug = ${slug}
    `);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run the seed**

Run: `npx tsx src/db/seed-skill-library.ts`

Expected: prints `Loaded N courses…` then a tick per course with drill counts, ends with `Done.`. No warnings about missing curation entries (if there are, update `curation.ts` and re-run — the script is idempotent).

- [ ] **Step 3: Verify the data**

Run from a `psql` session against the Neon DB (or use `npx tsx` with an ad-hoc query):

```bash
npx tsx -e 'import "dotenv/config"; import { db } from "./src/db"; import { skillCourses, skillDrills } from "./src/db/schema"; (async () => { const c = await db.select().from(skillCourses); const d = await db.select().from(skillDrills); console.log("courses:", c.length, "drills:", d.length); process.exit(0); })()'
```

Expected: `courses: 27 drills: 100+` (exact drill count depends on the scrape).

- [ ] **Step 4: Commit**

```bash
git add src/db/seed-skill-library.ts
git commit -m "feat(db): skill library ingest script"
```

---

## Task 6: Schema — custom plans, sessions, questionnaires, tour column, CUSTOM enum

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Extend the `ClassType` union**

In `src/db/schema.ts`, change line 14 from:

```ts
export type ClassType = "BARBELL" | "CROSSFIT" | "ENGINES" | "OTHER";
```

to:

```ts
export type ClassType = "BARBELL" | "CROSSFIT" | "ENGINES" | "OTHER" | "CUSTOM";
```

- [ ] **Step 2: Add `seenTourModules` column to `userProfiles`**

In the `userProfiles` definition (around line 110-121), add the new column **inside the existing `pgTable(...)` second-arg object**:

```ts
  // ... existing columns ...
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  seenTourModules: jsonb("seen_tour_modules").notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // ... rest ...
```

Add `sql` to the imports at the top:

```ts
import { sql } from "drizzle-orm";
```

- [ ] **Step 3: Add the custom-plan tables**

Append after `userExerciseSubstitutions` (around line 203):

```ts
export interface WeeklyDrillSlot {
  dow: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
  when: "before_class" | "after_class" | "open_gym";
  minutes: 15 | 30 | 45 | 60;
}

export interface GenerationMeta {
  rulesVersion: string;
  llmModel: string | null;
  generatedAt: string; // ISO
  llmFallbackUsed: boolean;
}

export const customPlans = pgTable(
  "custom_plans",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("active").$type<"active" | "paused" | "completed">(),
    goalSummary: text("goal_summary").notNull(),
    weeklyDrillSlots: jsonb("weekly_drill_slots").$type<WeeklyDrillSlot[]>().notNull(),
    selectedSkillIds: integer("selected_skill_ids").array().notNull(),
    planLengthWeeks: integer("plan_length_weeks").notNull().default(8),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    generationMeta: jsonb("generation_meta").$type<GenerationMeta>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("custom_plans_one_active")
      .on(t.userId)
      .where(sql`status = 'active'`),
  ]
);

export const customPlanSessions = pgTable("custom_plan_sessions", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id")
    .notNull()
    .references(() => customPlans.id, { onDelete: "cascade" }),
  workoutId: integer("workout_id").references(() => workouts.id, { onDelete: "set null" }),
  drillId: integer("drill_id").notNull().references(() => skillDrills.id),
  originalDrillId: integer("original_drill_id").references(() => skillDrills.id),
  plannedDate: date("planned_date").notNull(),
  plannedSlotMinutes: integer("planned_slot_minutes").notNull(),
  llmRationale: text("llm_rationale"),
  status: text("status").notNull().default("pending").$type<"pending" | "completed" | "skipped" | "swapped">(),
});

export const goalQuestionnaires = pgTable("goal_questionnaires", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  planId: integer("plan_id").references(() => customPlans.id, { onDelete: "set null" }),
  answers: jsonb("answers").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

- [ ] **Step 4: Push schema to Neon**

Run: `npx drizzle-kit push`

Expected: prompts about creating `custom_plans`, `custom_plan_sessions`, `goal_questionnaires`, and altering `user_profiles` to add `seen_tour_modules`. Accept all.

- [ ] **Step 5: Backfill `seenTourModules` for existing users**

Run:

```bash
npx tsx -e 'import "dotenv/config"; import { db } from "./src/db"; import { sql } from "drizzle-orm"; (async () => { const r = await db.execute(sql`UPDATE user_profiles SET seen_tour_modules = '\''["onboarding-v1"]'\''::jsonb WHERE onboarding_complete = true`); console.log("backfilled rows"); process.exit(0); })()'
```

Expected: command exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat(db): custom_plans + sessions + questionnaires; seen_tour_modules column; CUSTOM classType"
```

---

# Phase B — Programming engine (TDD)

## Task 7: Programming types module

**Files:**
- Create: `src/lib/programming/types.ts`

- [ ] **Step 1: Write the types**

Create `src/lib/programming/types.ts`:

```ts
import type { MovementPattern, WeeklyDrillSlot } from "@/db/schema";

export type TourId = "onboarding-v1" | "custom-programming-v1";

export interface WeaknessSignal {
  skillId: number;
  signalStrength: number; // 0-1
  reason: string;
}

export interface DraftSession {
  sessionIndex: number; // 0-based position in the draft schedule
  drillId: number;
  skillId: number;
  courseName: string;
  drillTitle: string;
  plannedDate: string; // YYYY-MM-DD
  plannedSlotMinutes: number;
  primaryMovementPatterns: MovementPattern[];
}

export interface LLMPersonalisation {
  intro: string;
  sessionRationales: Array<{ sessionIndex: number; rationale: string }>;
  swaps: Array<{ sessionIndex: number; newDrillId: number; reason: string }>;
}

export type { WeeklyDrillSlot };
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/programming/types.ts
git commit -m "feat(programming): shared types module"
```

---

## Task 8: Weakness inference (TDD)

**Files:**
- Create: `src/lib/programming/weakness.ts`
- Create: `src/lib/programming/weakness.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/programming/weakness.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  movementGapSignal,
  rpeFlagSignal,
  frequencyGapSignal,
  failedCompletionSignal,
  rankSignals,
} from "./weakness";

describe("movementGapSignal", () => {
  it("flags a skill the user has never logged Rx for", () => {
    const result = movementGapSignal({
      skillId: 1,
      skillName: "Ring Muscle Up",
      rxCount: 0,
      programmedCount: 12,
    });
    expect(result).not.toBeNull();
    expect(result!.signalStrength).toBeGreaterThan(0.5);
    expect(result!.reason).toContain("never logged Rx");
  });

  it("returns null when the user has logged Rx", () => {
    const result = movementGapSignal({
      skillId: 1,
      skillName: "Ring Muscle Up",
      rxCount: 3,
      programmedCount: 12,
    });
    expect(result).toBeNull();
  });

  it("returns null when never programmed", () => {
    expect(movementGapSignal({ skillId: 1, skillName: "X", rxCount: 0, programmedCount: 0 })).toBeNull();
  });
});

describe("rpeFlagSignal", () => {
  it("flags average RPE > 8.5 over last 30 days", () => {
    const r = rpeFlagSignal({ skillId: 2, pattern: "overhead", avgRpe: 9.0, sampleSize: 10 });
    expect(r).not.toBeNull();
    expect(r!.reason).toContain("overhead");
  });

  it("does not flag avg RPE below threshold", () => {
    expect(rpeFlagSignal({ skillId: 2, pattern: "overhead", avgRpe: 8.0, sampleSize: 10 })).toBeNull();
  });

  it("requires minimum sample size", () => {
    expect(rpeFlagSignal({ skillId: 2, pattern: "overhead", avgRpe: 9.5, sampleSize: 2 })).toBeNull();
  });
});

describe("frequencyGapSignal", () => {
  it("flags when no gymnastics in 14d but 3+ CrossFit sessions logged", () => {
    const r = frequencyGapSignal({ skillId: 3, gymnasticsCount14d: 0, crossfitCount14d: 4 });
    expect(r).not.toBeNull();
  });

  it("does not flag when gymnastics work is present", () => {
    expect(frequencyGapSignal({ skillId: 3, gymnasticsCount14d: 2, crossfitCount14d: 4 })).toBeNull();
  });
});

describe("failedCompletionSignal", () => {
  it("flags a failed completion in a WOD with a matching gymnastics movement", () => {
    const r = failedCompletionSignal({
      skillId: 4,
      wodName: "Fran",
      movement: "Ring Muscle Up",
      roundsCompleted: 2,
      prescribedRounds: 5,
    });
    expect(r).not.toBeNull();
    expect(r!.reason).toContain("Fran");
  });

  it("returns null when fully completed", () => {
    expect(
      failedCompletionSignal({
        skillId: 4,
        wodName: "Fran",
        movement: "Pull Up",
        roundsCompleted: 5,
        prescribedRounds: 5,
      })
    ).toBeNull();
  });
});

describe("rankSignals", () => {
  it("sorts by signalStrength descending and dedupes by skillId", () => {
    const out = rankSignals([
      { skillId: 1, signalStrength: 0.6, reason: "a" },
      { skillId: 1, signalStrength: 0.9, reason: "b" },
      { skillId: 2, signalStrength: 0.4, reason: "c" },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ skillId: 1, signalStrength: 0.9, reason: "b" });
    expect(out[1]).toMatchObject({ skillId: 2 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/programming/weakness.test.ts`

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement the pure scoring functions**

Create `src/lib/programming/weakness.ts`:

```ts
import type { WeaknessSignal } from "./types";

export function movementGapSignal(args: {
  skillId: number;
  skillName: string;
  rxCount: number;
  programmedCount: number;
}): WeaknessSignal | null {
  if (args.programmedCount === 0) return null;
  if (args.rxCount > 0) return null;
  const strength = Math.min(1, args.programmedCount / 10);
  return {
    skillId: args.skillId,
    signalStrength: 0.5 + strength * 0.5,
    reason: `You've never logged Rx on ${args.skillName} in ${args.programmedCount} logged WODs that programmed it`,
  };
}

export function rpeFlagSignal(args: {
  skillId: number;
  pattern: string;
  avgRpe: number;
  sampleSize: number;
}): WeaknessSignal | null {
  if (args.sampleSize < 5) return null;
  if (args.avgRpe <= 8.5) return null;
  const strength = Math.min(1, (args.avgRpe - 8.5) / 1.5);
  return {
    skillId: args.skillId,
    signalStrength: 0.4 + strength * 0.4,
    reason: `Your ${args.pattern} lifts are averaging RPE ${args.avgRpe.toFixed(1)} — ${args.pattern} skill work may help`,
  };
}

export function frequencyGapSignal(args: {
  skillId: number;
  gymnasticsCount14d: number;
  crossfitCount14d: number;
}): WeaknessSignal | null {
  if (args.gymnasticsCount14d > 0) return null;
  if (args.crossfitCount14d < 3) return null;
  return {
    skillId: args.skillId,
    signalStrength: 0.55,
    reason: "You're doing CrossFit but skipping gymnastics — pull/push gym work suggested",
  };
}

export function failedCompletionSignal(args: {
  skillId: number;
  wodName: string;
  movement: string;
  roundsCompleted: number;
  prescribedRounds: number;
}): WeaknessSignal | null {
  if (args.roundsCompleted >= args.prescribedRounds) return null;
  const shortfall = (args.prescribedRounds - args.roundsCompleted) / args.prescribedRounds;
  return {
    skillId: args.skillId,
    signalStrength: 0.4 + shortfall * 0.4,
    reason: `You stopped short on ${args.wodName} — ${args.movement} may be the bottleneck`,
  };
}

export function rankSignals(signals: WeaknessSignal[]): WeaknessSignal[] {
  const bySkill = new Map<number, WeaknessSignal>();
  for (const s of signals) {
    const existing = bySkill.get(s.skillId);
    if (!existing || s.signalStrength > existing.signalStrength) bySkill.set(s.skillId, s);
  }
  return Array.from(bySkill.values()).sort((a, b) => b.signalStrength - a.signalStrength);
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/lib/programming/weakness.test.ts`

Expected: PASS.

- [ ] **Step 5: Add the DB-backed inference function**

Append to `src/lib/programming/weakness.ts`:

```ts
import { db } from "@/db";
import { skillCourses, skillDrills, wodResults, userLiftLogs, workoutSections, workouts } from "@/db/schema";
import { sql, eq, and, gte, inArray } from "drizzle-orm";

export async function getWeaknessSignalsForUser(userId: string): Promise<WeaknessSignal[]> {
  // 1. Movement-gap signals: for each course, count programmed WODs containing the course name
  //    in any wod_movement, and how many were logged Rx by this user.
  const courses = await db.select({ id: skillCourses.id, name: skillCourses.name }).from(skillCourses);

  const signals: WeaknessSignal[] = [];

  for (const c of courses) {
    const rows = await db.execute(sql`
      SELECT
        COUNT(DISTINCT wod_results.id) FILTER (WHERE wod_results.rx_level IN ('RX','RX_PLUS')) AS rx_count,
        COUNT(DISTINCT workout_sections.id) AS programmed_count
      FROM workout_sections
      LEFT JOIN wod_results ON wod_results.section_id = workout_sections.id AND wod_results.user_id = ${userId}
      WHERE workout_sections.wod_movements::text ILIKE ${"%" + c.name + "%"}
    `);
    const r = (rows as unknown as { rows: Array<{ rx_count: number; programmed_count: number }> }).rows[0];
    if (!r) continue;
    const s = movementGapSignal({
      skillId: c.id,
      skillName: c.name,
      rxCount: Number(r.rx_count) || 0,
      programmedCount: Number(r.programmed_count) || 0,
    });
    if (s) signals.push(s);
  }

  return rankSignals(signals).slice(0, 5);
}
```

- [ ] **Step 6: Wire the remaining three signals into the DB-backed function**

The spec lists four signal types (movement-gap, RPE flag, frequency gap, failed completion). Step 5 implemented movement-gap end-to-end; this step adds the other three so `getWeaknessSignalsForUser` returns a complete signal mix.

Replace the body of `getWeaknessSignalsForUser` in `src/lib/programming/weakness.ts` with this expanded version:

```ts
export async function getWeaknessSignalsForUser(userId: string): Promise<WeaknessSignal[]> {
  const courses = await db.select({ id: skillCourses.id, name: skillCourses.name, category: skillCourses.category }).from(skillCourses);

  const signals: WeaknessSignal[] = [];

  // 1. Movement-gap (per course, by course name in wod_movements)
  for (const c of courses) {
    const rows = await db.execute(sql`
      SELECT
        COUNT(DISTINCT wod_results.id) FILTER (WHERE wod_results.rx_level IN ('RX','RX_PLUS')) AS rx_count,
        COUNT(DISTINCT workout_sections.id) AS programmed_count
      FROM workout_sections
      LEFT JOIN wod_results ON wod_results.section_id = workout_sections.id AND wod_results.user_id = ${userId}
      WHERE workout_sections.wod_movements::text ILIKE ${"%" + c.name + "%"}
    `);
    const r = (rows as unknown as { rows: Array<{ rx_count: number; programmed_count: number }> }).rows[0];
    if (!r) continue;
    const s = movementGapSignal({
      skillId: c.id,
      skillName: c.name,
      rxCount: Number(r.rx_count) || 0,
      programmedCount: Number(r.programmed_count) || 0,
    });
    if (s) signals.push(s);
  }

  // 2. RPE flag (parse "RPE X.X" or "RPE X" from user_lift_logs.notes, last 30d)
  //    Crude but deterministic: any lift whose notes match /\bRPE\s*([\d.]+)/i contributes.
  const last30 = new Date(); last30.setUTCDate(last30.getUTCDate() - 30);
  const last30Iso = last30.toISOString().slice(0, 10);
  const rpeRows = await db
    .select({ liftName: userLiftLogs.liftName, notes: userLiftLogs.notes })
    .from(userLiftLogs)
    .where(and(eq(userLiftLogs.userId, userId), gte(userLiftLogs.date, last30Iso)));
  const rpeByPattern = new Map<string, { sum: number; count: number }>();
  for (const row of rpeRows) {
    if (!row.notes) continue;
    const m = row.notes.match(/\brpe\s*([\d.]+)/i);
    if (!m) continue;
    const rpe = parseFloat(m[1]);
    if (!Number.isFinite(rpe)) continue;
    // crude lift→pattern bucket: anything with "press"/"jerk"/"snatch"/"clean" → overhead;
    // squat → squat; deadlift → hinge; otherwise → other (skipped)
    const lift = row.liftName.toLowerCase();
    let pattern: string | null = null;
    if (/press|jerk|snatch|clean|push/.test(lift)) pattern = "overhead";
    else if (/squat/.test(lift)) pattern = "squat";
    else if (/deadlift|rdl|pull/.test(lift)) pattern = "hinge";
    if (!pattern) continue;
    const agg = rpeByPattern.get(pattern) ?? { sum: 0, count: 0 };
    agg.sum += rpe; agg.count += 1;
    rpeByPattern.set(pattern, agg);
  }
  // Map pattern → first course in a related category. Crude — fine for v0 UX.
  const patternToCategory: Record<string, string> = { overhead: "handstand", squat: "lifting", hinge: "lifting" };
  for (const [pattern, agg] of rpeByPattern.entries()) {
    if (agg.count < 5) continue;
    const avg = agg.sum / agg.count;
    if (avg <= 8.5) continue;
    const cat = patternToCategory[pattern];
    const targetCourse = courses.find((c) => c.category === cat);
    if (!targetCourse) continue;
    const s = rpeFlagSignal({ skillId: targetCourse.id, pattern, avgRpe: avg, sampleSize: agg.count });
    if (s) signals.push(s);
  }

  // 3. Frequency gap — zero gymnastics_pull/handstand wod_results in 14d AND >=3 CrossFit workouts in 14d
  const last14 = new Date(); last14.setUTCDate(last14.getUTCDate() - 14);
  const last14Iso = last14.toISOString().slice(0, 10);
  const cfRows = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(workouts)
    .where(and(eq(workouts.classType, "CROSSFIT"), gte(workouts.date, last14Iso)));
  const crossfitCount = cfRows[0]?.cnt ?? 0;
  const gymRows = await db.execute(sql`
    SELECT COUNT(*) AS cnt FROM wod_results
    JOIN workout_sections ON workout_sections.id = wod_results.section_id
    WHERE wod_results.user_id = ${userId}
      AND wod_results.created_at >= ${last14Iso}
      AND (workout_sections.wod_movements::text ~* '\\m(pull|muscle|handstand|toes to bar|ring)\\M')
  `);
  const gymCount = Number((gymRows as unknown as { rows: Array<{ cnt: number }> }).rows[0]?.cnt ?? 0);
  if (crossfitCount >= 3 && gymCount === 0) {
    const candidate = courses.find((c) => c.category === "gymnastics_pull");
    if (candidate) {
      const s = frequencyGapSignal({ skillId: candidate.id, gymnasticsCount14d: 0, crossfitCount14d: crossfitCount });
      if (s) signals.push(s);
    }
  }

  // 4. Failed completion — wod_results notes referencing rounds_completed/prescribed < 1
  //    Simplified: PR #13 stores completion-mode scores as "<done>/<total>" in score_value when not full.
  //    Any score_value matching /^(\d+)\/(\d+)$/ with first < second counts.
  const failRows = await db
    .select({
      scoreValue: wodResults.scoreValue,
      sectionId: wodResults.sectionId,
    })
    .from(wodResults)
    .where(eq(wodResults.userId, userId));
  for (const row of failRows) {
    const m = row.scoreValue.match(/^(\d+)\/(\d+)$/);
    if (!m) continue;
    const done = parseInt(m[1], 10);
    const total = parseInt(m[2], 10);
    if (done >= total || total === 0) continue;
    const [section] = await db.select({ wodName: workoutSections.wodName, movements: workoutSections.wodMovements }).from(workoutSections).where(eq(workoutSections.id, row.sectionId));
    if (!section || !section.movements) continue;
    const movementBlob = JSON.stringify(section.movements).toLowerCase();
    for (const c of courses) {
      if (!movementBlob.includes(c.name.toLowerCase().split(" ")[0])) continue;
      const s = failedCompletionSignal({
        skillId: c.id,
        wodName: section.wodName ?? "WOD",
        movement: c.name,
        roundsCompleted: done,
        prescribedRounds: total,
      });
      if (s) signals.push(s);
      break;
    }
  }

  return rankSignals(signals).slice(0, 5);
}
```

> The RPE parsing and movement→skill matching are intentionally crude — this is "for fun" personal-project quality, sufficient for the wizard's pre-tick suggestions. If a future iteration wants higher fidelity, add structured RPE columns to `user_lift_logs` and a movement → skill mapping table.

- [ ] **Step 7: Smoke-verify the DB-backed function works**

Run (with a real user id that has some logged data):

```bash
npx tsx -e 'import "dotenv/config"; import { getWeaknessSignalsForUser } from "./src/lib/programming/weakness"; (async () => { const s = await getWeaknessSignalsForUser("user_TEST_REPLACE_ME"); console.log(JSON.stringify(s, null, 2)); process.exit(0); })()'
```

Expected: a JSON array of 0-5 signals, ranked by `signalStrength` descending. No exceptions.

- [ ] **Step 8: Commit**

```bash
git add src/lib/programming/weakness.ts src/lib/programming/weakness.test.ts
git commit -m "feat(programming): weakness inference — all 4 signals (movement-gap, RPE, frequency, completion)"
```

---

## Task 9: Rules-based scheduler (TDD)

**Files:**
- Create: `src/lib/programming/scheduler.ts`
- Create: `src/lib/programming/scheduler.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/programming/scheduler.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { placeDrills, conflictsWithExisting, type SchedulerInput } from "./scheduler";
import type { WeeklyDrillSlot } from "@/db/schema";

const baseSlot = (dow: WeeklyDrillSlot["dow"], minutes: WeeklyDrillSlot["minutes"] = 30): WeeklyDrillSlot => ({
  dow,
  when: "after_class",
  minutes,
});

const drill = (id: number, courseId: number, week: number, order: number, mins: number, patterns: ("pull" | "press")[] = []) => ({
  id,
  courseId,
  week,
  orderInWeek: order,
  estimatedSessionMinutes: mins,
  primaryMovementPatterns: patterns,
  title: `drill-${id}`,
  courseName: `course-${courseId}`,
});

describe("conflictsWithExisting", () => {
  it("returns true when 2+ workouts already on the day", () => {
    const existing = [
      { date: "2026-05-19", primaryPatterns: [] },
      { date: "2026-05-19", primaryPatterns: [] },
    ];
    expect(conflictsWithExisting("2026-05-19", ["pull"], existing)).toBe(true);
  });

  it("returns true when same pattern within 24h", () => {
    const existing = [{ date: "2026-05-18", primaryPatterns: ["pull"] as const }];
    expect(conflictsWithExisting("2026-05-19", ["pull"], existing)).toBe(true);
  });

  it("returns false when no overlap and only 1 existing", () => {
    const existing = [{ date: "2026-05-19", primaryPatterns: ["squat"] as const }];
    expect(conflictsWithExisting("2026-05-19", ["pull"], existing)).toBe(false);
  });
});

describe("placeDrills", () => {
  it("places drills round-robin across selected skills", () => {
    const input: SchedulerInput = {
      startsOn: "2026-05-18", // Mon
      weeks: 1,
      slots: [baseSlot("TUE"), baseSlot("WED"), baseSlot("THU"), baseSlot("FRI")],
      candidates: [
        { skillId: 10, drillsPerWeek: 2, drills: [drill(1, 10, 1, 1, 25), drill(2, 10, 1, 2, 25)] },
        { skillId: 11, drillsPerWeek: 2, drills: [drill(3, 11, 1, 1, 25), drill(4, 11, 1, 2, 25)] },
      ],
      existingWorkouts: [],
    };
    const { placements, unplaceable } = placeDrills(input);
    expect(unplaceable).toHaveLength(0);
    expect(placements.map((p) => p.skillId)).toEqual([10, 11, 10, 11]);
  });

  it("skips a slot when the drill is longer than slot minutes", () => {
    const input: SchedulerInput = {
      startsOn: "2026-05-18",
      weeks: 1,
      slots: [baseSlot("TUE", 15), baseSlot("WED", 45)],
      candidates: [{ skillId: 10, drillsPerWeek: 1, drills: [drill(1, 10, 1, 1, 30)] }],
      existingWorkouts: [],
    };
    const { placements } = placeDrills(input);
    expect(placements).toHaveLength(1);
    expect(placements[0].plannedDate).toBe("2026-05-20"); // WED, not TUE
  });

  it("reports unplaceable drills when slots run out", () => {
    const input: SchedulerInput = {
      startsOn: "2026-05-18",
      weeks: 1,
      slots: [baseSlot("TUE")],
      candidates: [
        { skillId: 10, drillsPerWeek: 1, drills: [drill(1, 10, 1, 1, 25), drill(2, 10, 1, 2, 25)] },
      ],
      existingWorkouts: [],
    };
    const { placements, unplaceable } = placeDrills(input);
    expect(placements).toHaveLength(1);
    expect(unplaceable).toHaveLength(1);
    expect(unplaceable[0].drill.id).toBe(2);
  });

  it("respects existing workouts with conflicting patterns", () => {
    const input: SchedulerInput = {
      startsOn: "2026-05-18",
      weeks: 1,
      slots: [baseSlot("TUE"), baseSlot("WED")],
      candidates: [
        { skillId: 10, drillsPerWeek: 1, drills: [drill(1, 10, 1, 1, 25, ["pull"])] },
      ],
      existingWorkouts: [{ date: "2026-05-19", primaryPatterns: ["pull"] }], // TUE — should push to WED
    };
    const { placements } = placeDrills(input);
    expect(placements[0].plannedDate).toBe("2026-05-20");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/programming/scheduler.test.ts`

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement the scheduler**

Create `src/lib/programming/scheduler.ts`:

```ts
import type { MovementPattern, WeeklyDrillSlot } from "@/db/schema";
import type { DraftSession } from "./types";

export const RULES_VERSION = "v0";

const DOW_INDEX: Record<WeeklyDrillSlot["dow"], number> = {
  MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 0,
};

export interface SchedulerDrill {
  id: number;
  courseId: number;
  week: number;
  orderInWeek: number;
  estimatedSessionMinutes: number;
  primaryMovementPatterns: MovementPattern[];
  title: string;
  courseName: string;
}

export interface SchedulerSkillCandidate {
  skillId: number;
  drillsPerWeek: number;
  drills: SchedulerDrill[]; // ordered (week, orderInWeek)
}

export interface ExistingWorkout {
  date: string; // YYYY-MM-DD
  primaryPatterns: readonly MovementPattern[];
}

export interface SchedulerInput {
  startsOn: string; // YYYY-MM-DD
  weeks: number;
  slots: WeeklyDrillSlot[];
  candidates: SchedulerSkillCandidate[];
  existingWorkouts: ExistingWorkout[];
}

export interface SchedulerOutput {
  placements: DraftSession[];
  unplaceable: Array<{ skillId: number; drill: SchedulerDrill }>;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dowOf(iso: string): number {
  return new Date(iso + "T00:00:00Z").getUTCDay();
}

interface CalendarSlot {
  date: string;
  minutes: WeeklyDrillSlot["minutes"];
  consumed: boolean;
}

function buildSlotCalendar(slots: WeeklyDrillSlot[], startsOn: string, weeks: number): CalendarSlot[] {
  const out: CalendarSlot[] = [];
  for (let w = 0; w < weeks; w++) {
    for (const slot of slots) {
      const targetDow = DOW_INDEX[slot.dow];
      const startDow = dowOf(startsOn);
      const offset = (targetDow - startDow + 7) % 7;
      const date = addDays(startsOn, w * 7 + offset);
      out.push({ date, minutes: slot.minutes, consumed: false });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function conflictsWithExisting(
  date: string,
  patterns: readonly MovementPattern[],
  existing: readonly ExistingWorkout[]
): boolean {
  const sameDay = existing.filter((w) => w.date === date);
  if (sameDay.length >= 2) return true;
  const prev = addDays(date, -1);
  const next = addDays(date, 1);
  for (const w of existing) {
    if (w.date !== prev && w.date !== date && w.date !== next) continue;
    for (const p of patterns) if (w.primaryPatterns.includes(p)) return true;
  }
  return false;
}

function roundRobin(candidates: SchedulerSkillCandidate[]): Array<{ skillId: number; drill: SchedulerDrill }> {
  const cursors = candidates.map(() => 0);
  const out: Array<{ skillId: number; drill: SchedulerDrill }> = [];
  let added = true;
  while (added) {
    added = false;
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      if (cursors[i] < c.drills.length) {
        out.push({ skillId: c.skillId, drill: c.drills[cursors[i]] });
        cursors[i] += 1;
        added = true;
      }
    }
  }
  return out;
}

export function placeDrills(input: SchedulerInput): SchedulerOutput {
  const calendar = buildSlotCalendar(input.slots, input.startsOn, input.weeks);
  const queue = roundRobin(input.candidates);
  const placements: DraftSession[] = [];
  const unplaceable: SchedulerOutput["unplaceable"] = [];
  let sessionIndex = 0;

  for (const item of queue) {
    let placed = false;
    for (const slot of calendar) {
      if (slot.consumed) continue;
      if (slot.minutes < item.drill.estimatedSessionMinutes) continue;
      if (conflictsWithExisting(slot.date, item.drill.primaryMovementPatterns, input.existingWorkouts)) continue;
      placements.push({
        sessionIndex: sessionIndex++,
        drillId: item.drill.id,
        skillId: item.skillId,
        courseName: item.drill.courseName,
        drillTitle: item.drill.title,
        plannedDate: slot.date,
        plannedSlotMinutes: slot.minutes,
        primaryMovementPatterns: item.drill.primaryMovementPatterns,
      });
      slot.consumed = true;
      placed = true;
      break;
    }
    if (!placed) unplaceable.push({ skillId: item.skillId, drill: item.drill });
  }

  return { placements, unplaceable };
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/lib/programming/scheduler.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/programming/scheduler.ts src/lib/programming/scheduler.test.ts
git commit -m "feat(programming): rules-based scheduler with conflict detection"
```

---

## Task 10: LLM response validator (TDD)

**Files:**
- Create: `src/lib/programming/validator.ts`
- Create: `src/lib/programming/validator.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/programming/validator.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validatePersonalisation, parseAndValidateLLMResponse } from "./validator";
import type { DraftSession, LLMPersonalisation } from "./types";

const draft: DraftSession[] = [
  { sessionIndex: 0, drillId: 100, skillId: 10, courseName: "C1", drillTitle: "T1", plannedDate: "2026-05-19", plannedSlotMinutes: 30, primaryMovementPatterns: ["pull"] },
  { sessionIndex: 1, drillId: 101, skillId: 11, courseName: "C2", drillTitle: "T2", plannedDate: "2026-05-21", plannedSlotMinutes: 30, primaryMovementPatterns: ["press"] },
];

// Maps used by the validator to enforce hard constraints
const allowedDrillsBySkill = new Map<number, number[]>([[10, [100, 200]], [11, [101, 201]]]);
const drillMinutes = new Map<number, number>([[100, 25], [101, 25], [200, 25], [201, 35]]);
const drillSkill = new Map<number, number>([[100, 10], [101, 11], [200, 10], [201, 11]]);

const env = { allowedDrillsBySkill, drillMinutes, drillSkill };

describe("validatePersonalisation", () => {
  it("accepts a well-formed personalisation", () => {
    const p: LLMPersonalisation = {
      intro: "Nice plan.",
      sessionRationales: [{ sessionIndex: 0, rationale: "build base" }],
      swaps: [{ sessionIndex: 1, newDrillId: 201, reason: "harder" }],
    };
    const r = validatePersonalisation(p, draft, env);
    expect(r.intro).toBe("Nice plan.");
    expect(r.swaps).toHaveLength(0); // 201 = 35 mins > 30 slot, swap dropped
  });

  it("drops a swap whose new drill is not in the user's selected skill set", () => {
    const p: LLMPersonalisation = {
      intro: "",
      sessionRationales: [],
      swaps: [{ sessionIndex: 0, newDrillId: 999, reason: "random" }],
    };
    expect(validatePersonalisation(p, draft, env).swaps).toHaveLength(0);
  });

  it("drops a swap whose new drill belongs to a different skill than the original", () => {
    const p: LLMPersonalisation = {
      intro: "",
      sessionRationales: [],
      swaps: [{ sessionIndex: 0, newDrillId: 101, reason: "wrong skill" }], // session 0 is skill 10, drill 101 is skill 11
    };
    expect(validatePersonalisation(p, draft, env).swaps).toHaveLength(0);
  });

  it("drops a swap whose new drill exceeds slot minutes", () => {
    const p: LLMPersonalisation = {
      intro: "",
      sessionRationales: [],
      swaps: [{ sessionIndex: 1, newDrillId: 201, reason: "too long" }], // 35 > 30
    };
    expect(validatePersonalisation(p, draft, env).swaps).toHaveLength(0);
  });

  it("drops a swap with out-of-range sessionIndex", () => {
    const p: LLMPersonalisation = {
      intro: "",
      sessionRationales: [],
      swaps: [{ sessionIndex: 99, newDrillId: 101, reason: "bad index" }],
    };
    expect(validatePersonalisation(p, draft, env).swaps).toHaveLength(0);
  });

  it("drops a rationale with out-of-range sessionIndex", () => {
    const p: LLMPersonalisation = {
      intro: "",
      sessionRationales: [{ sessionIndex: 99, rationale: "ghost" }],
      swaps: [],
    };
    expect(validatePersonalisation(p, draft, env).sessionRationales).toHaveLength(0);
  });
});

describe("parseAndValidateLLMResponse", () => {
  it("throws on non-JSON input", () => {
    expect(() => parseAndValidateLLMResponse("not json", draft, env)).toThrow();
  });

  it("throws when required fields are missing", () => {
    expect(() => parseAndValidateLLMResponse(JSON.stringify({ intro: "x" }), draft, env)).toThrow();
  });

  it("succeeds on a minimal valid payload", () => {
    const r = parseAndValidateLLMResponse(
      JSON.stringify({ intro: "hi", sessionRationales: [], swaps: [] }),
      draft,
      env
    );
    expect(r.intro).toBe("hi");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/programming/validator.test.ts`

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement the validator**

Create `src/lib/programming/validator.ts`:

```ts
import type { DraftSession, LLMPersonalisation } from "./types";

export interface ValidationEnv {
  allowedDrillsBySkill: Map<number, number[]>;
  drillMinutes: Map<number, number>;
  drillSkill: Map<number, number>;
}

export function validatePersonalisation(
  p: LLMPersonalisation,
  draft: DraftSession[],
  env: ValidationEnv
): LLMPersonalisation {
  const rationales = p.sessionRationales.filter((r) => r.sessionIndex >= 0 && r.sessionIndex < draft.length);

  const swaps = p.swaps.filter((s) => {
    if (s.sessionIndex < 0 || s.sessionIndex >= draft.length) return false;
    const session = draft[s.sessionIndex];
    const drillSkill = env.drillSkill.get(s.newDrillId);
    if (drillSkill === undefined) return false;
    if (drillSkill !== session.skillId) return false;
    const allowed = env.allowedDrillsBySkill.get(session.skillId) ?? [];
    if (!allowed.includes(s.newDrillId)) return false;
    const mins = env.drillMinutes.get(s.newDrillId);
    if (mins === undefined) return false;
    if (mins > session.plannedSlotMinutes) return false;
    return true;
  });

  return { intro: p.intro ?? "", sessionRationales: rationales, swaps };
}

export function parseAndValidateLLMResponse(
  raw: string,
  draft: DraftSession[],
  env: ValidationEnv
): LLMPersonalisation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("LLM response is not valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null) throw new Error("LLM response must be a JSON object");
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.intro !== "string") throw new Error("LLM response missing 'intro' string");
  if (!Array.isArray(obj.sessionRationales)) throw new Error("LLM response missing 'sessionRationales' array");
  if (!Array.isArray(obj.swaps)) throw new Error("LLM response missing 'swaps' array");
  // Shape-validate elements just enough; validatePersonalisation does the semantic filtering.
  for (const r of obj.sessionRationales as unknown[]) {
    if (typeof r !== "object" || r === null) throw new Error("sessionRationales contains non-object");
    const rr = r as Record<string, unknown>;
    if (typeof rr.sessionIndex !== "number" || typeof rr.rationale !== "string") {
      throw new Error("sessionRationales entry missing fields");
    }
  }
  for (const s of obj.swaps as unknown[]) {
    if (typeof s !== "object" || s === null) throw new Error("swaps contains non-object");
    const ss = s as Record<string, unknown>;
    if (typeof ss.sessionIndex !== "number" || typeof ss.newDrillId !== "number" || typeof ss.reason !== "string") {
      throw new Error("swaps entry missing fields");
    }
  }
  return validatePersonalisation(obj as unknown as LLMPersonalisation, draft, env);
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/lib/programming/validator.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/programming/validator.ts src/lib/programming/validator.test.ts
git commit -m "feat(programming): LLM response validator with hard constraints"
```

---

## Task 11: LLM personalisation client

**Files:**
- Create: `src/lib/programming/personalise.ts`

- [ ] **Step 1: Implement the client**

Create `src/lib/programming/personalise.ts`:

```ts
import Anthropic from "@anthropic-ai/sdk";
import type { DraftSession, LLMPersonalisation, WeaknessSignal } from "./types";
import { parseAndValidateLLMResponse, type ValidationEnv } from "./validator";

const MODEL = "claude-haiku-4-5-20251001";

export interface PersonaliseInput {
  goalSummary: string;
  weaknessSignals: WeaknessSignal[];
  draft: DraftSession[];
  activityDigest: string; // pre-formatted summary, no PII
  env: ValidationEnv;
}

export interface PersonaliseResult {
  personalisation: LLMPersonalisation;
  llmFallbackUsed: boolean;
  modelUsed: string | null;
}

function buildPrompt(input: PersonaliseInput): string {
  return [
    "You are a CrossFit programming assistant. You will receive a user's goals, weakness signals, a draft 8-week plan, and recent activity. Personalise the plan.",
    "",
    "## Goal",
    input.goalSummary,
    "",
    "## Weakness signals (top 5, ranked)",
    input.weaknessSignals.map((s) => `- skill ${s.skillId} (${(s.signalStrength * 100).toFixed(0)}%): ${s.reason}`).join("\n") || "(none)",
    "",
    "## Draft schedule",
    input.draft.map((d) => `- session ${d.sessionIndex}: ${d.courseName} — ${d.drillTitle} on ${d.plannedDate} (${d.plannedSlotMinutes}min, patterns: ${d.primaryMovementPatterns.join(",")})`).join("\n"),
    "",
    "## Recent activity (last 14 days)",
    input.activityDigest,
    "",
    "## Your task",
    "Return STRICT JSON with this shape (no markdown, no commentary):",
    "{",
    '  "intro": "2-3 lines about this plan",',
    '  "sessionRationales": [{"sessionIndex": number, "rationale": "one line"}],',
    '  "swaps": [{"sessionIndex": number, "newDrillId": number, "reason": "one line"}]',
    "}",
    "",
    "Rules:",
    "- Swaps may only replace a session's drill with another drill from the SAME skill (course). If unsure, do not swap.",
    "- A replacement drill must fit the original session's slot duration.",
    "- Provide at most one rationale per session.",
    "- Keep intros and reasons under 200 characters.",
  ].join("\n");
}

export async function personalisePlan(input: PersonaliseInput): Promise<PersonaliseResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      personalisation: { intro: "", sessionRationales: [], swaps: [] },
      llmFallbackUsed: true,
      modelUsed: null,
    };
  }

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      messages: [{ role: "user", content: buildPrompt(input) }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
    const personalisation = parseAndValidateLLMResponse(raw, input.draft, input.env);
    return { personalisation, llmFallbackUsed: false, modelUsed: MODEL };
  } catch (err) {
    console.warn("[programming] LLM personalisation failed, falling back:", err);
    return {
      personalisation: { intro: "", sessionRationales: [], swaps: [] },
      llmFallbackUsed: true,
      modelUsed: MODEL,
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/programming/personalise.ts
git commit -m "feat(programming): LLM personalisation client (Claude haiku 4.5)"
```

---

## Task 12: Tour helper (TDD)

**Files:**
- Create: `src/lib/programming/tour.ts`
- Create: `src/lib/programming/tour.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/programming/tour.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { pickNextTour, markTourSeenLocal } from "./tour";

describe("pickNextTour", () => {
  it("returns 'onboarding-v1' for a brand-new user", () => {
    expect(pickNextTour([], false)).toBe("onboarding-v1");
  });

  it("returns 'custom-programming-v1' for a user who finished onboarding but hasn't seen it", () => {
    expect(pickNextTour(["onboarding-v1"], true)).toBe("custom-programming-v1");
  });

  it("returns null when both tours seen", () => {
    expect(pickNextTour(["onboarding-v1", "custom-programming-v1"], true)).toBeNull();
  });

  it("returns 'onboarding-v1' even if custom-programming-v1 was somehow seen but onboarding wasn't", () => {
    // edge case — should never happen in practice but the function must be deterministic
    expect(pickNextTour(["custom-programming-v1"], false)).toBe("onboarding-v1");
  });
});

describe("markTourSeenLocal", () => {
  it("appends the tour id", () => {
    expect(markTourSeenLocal([], "onboarding-v1")).toEqual(["onboarding-v1"]);
  });

  it("dedupes", () => {
    expect(markTourSeenLocal(["onboarding-v1"], "onboarding-v1")).toEqual(["onboarding-v1"]);
  });

  it("for 'onboarding-v1' also marks 'custom-programming-v1'", () => {
    expect(markTourSeenLocal([], "onboarding-v1")).toEqual(["onboarding-v1", "custom-programming-v1"]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/programming/tour.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/lib/programming/tour.ts`:

```ts
import type { TourId } from "./types";

export function pickNextTour(seen: TourId[] | string[], onboardingComplete: boolean): TourId | null {
  if (!onboardingComplete) return "onboarding-v1";
  if (!seen.includes("custom-programming-v1")) return "custom-programming-v1";
  return null;
}

export function markTourSeenLocal(seen: TourId[] | string[], tourId: TourId): TourId[] {
  const out = new Set<TourId>(seen as TourId[]);
  out.add(tourId);
  // Brand-new users complete onboarding-v1 and shouldn't be re-prompted with the
  // custom-programming-v1 spotlight immediately after — the onboarding tour already
  // includes a step pointing at the CUSTOM tab.
  if (tourId === "onboarding-v1") out.add("custom-programming-v1");
  return Array.from(out);
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/lib/programming/tour.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/programming/tour.ts src/lib/programming/tour.test.ts
git commit -m "feat(programming): pickNextTour + markTourSeenLocal helpers"
```

---

# Phase C — Server actions

## Task 13: `createPlan` server action

**Files:**
- Modify: `src/app/actions.ts`

- [ ] **Step 1: Add the `createPlan` action**

In `src/app/actions.ts`, add to the imports near the top:

```ts
import {
  customPlans, customPlanSessions, goalQuestionnaires, skillCourses, skillDrills,
  workouts, workoutSections, userProfiles,
  type WeeklyDrillSlot, type GenerationMeta, type SkillDrillSection,
} from "@/db/schema";
import { placeDrills, RULES_VERSION, type SchedulerSkillCandidate, type ExistingWorkout } from "@/lib/programming/scheduler";
import { personalisePlan } from "@/lib/programming/personalise";
import { getWeaknessSignalsForUser } from "@/lib/programming/weakness";
import type { ValidationEnv } from "@/lib/programming/validator";
```

Append at the end of `src/app/actions.ts`:

```ts
// ── Custom Programming ──

export interface CreatePlanAnswers {
  wodsPerWeek: number;
  ropeConfidence: number;       // 1-5
  handstandConfidence: number;  // 1-5
  pullGymConfidence: number;    // 1-5
}

export async function createPlan(
  answers: CreatePlanAnswers,
  slots: WeeklyDrillSlot[],
  skillIds: number[]
): Promise<{ planId: number }> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  if (skillIds.length === 0) throw new Error("Pick at least one skill");
  if (skillIds.length > 5) throw new Error("Pick at most 5 skills");
  if (slots.length === 0) throw new Error("Add at least one training slot");

  const PLAN_LENGTH_WEEKS = 8;
  const startsOn = todayISO();
  const endsOn = addDaysISO(startsOn, PLAN_LENGTH_WEEKS * 7 - 1);

  // Load selected courses + drills
  const selectedCourses = await db
    .select()
    .from(skillCourses)
    .where(inArray(skillCourses.id, skillIds));
  const allDrills = await db
    .select()
    .from(skillDrills)
    .where(inArray(skillDrills.courseId, skillIds));

  const candidates: SchedulerSkillCandidate[] = selectedCourses.map((c) => ({
    skillId: c.id,
    drillsPerWeek: c.drillsPerWeek,
    drills: allDrills
      .filter((d) => d.courseId === c.id)
      .sort((a, b) => a.week - b.week || a.orderInWeek - b.orderInWeek)
      .map((d) => ({
        id: d.id,
        courseId: c.id,
        week: d.week,
        orderInWeek: d.orderInWeek,
        estimatedSessionMinutes: c.estimatedSessionMinutes,
        primaryMovementPatterns: d.primaryMovementPatterns,
        title: d.title,
        courseName: c.name,
      })),
  }));

  // Load existing workouts in window for conflict checks
  const existingRows = await db
    .select({
      date: workouts.date,
      patterns: sql<string[]>`COALESCE((SELECT array_agg(DISTINCT m->>'name') FROM workout_sections ws, jsonb_array_elements(COALESCE(ws.wod_movements, '[]'::jsonb)) m WHERE ws.workout_id = ${workouts.id}), ARRAY[]::text[])`,
    })
    .from(workouts)
    .where(and(gte(workouts.date, startsOn), lte(workouts.date, endsOn)));

  const existingWorkouts: ExistingWorkout[] = existingRows.map((r) => ({
    date: r.date as unknown as string,
    primaryPatterns: classifyMovements(r.patterns ?? []),
  }));

  // Pass 1: rules scheduler
  const { placements, unplaceable } = placeDrills({
    startsOn, weeks: PLAN_LENGTH_WEEKS, slots, candidates, existingWorkouts,
  });
  if (placements.length === 0) throw new Error("No sessions could be placed — add more slots or trim skills");

  // Build validator env for pass 2
  const allowedDrillsBySkill = new Map<number, number[]>();
  const drillMinutes = new Map<number, number>();
  const drillSkill = new Map<number, number>();
  for (const c of selectedCourses) {
    const drillIds = allDrills.filter((d) => d.courseId === c.id).map((d) => d.id);
    allowedDrillsBySkill.set(c.id, drillIds);
    for (const did of drillIds) {
      drillMinutes.set(did, c.estimatedSessionMinutes);
      drillSkill.set(did, c.id);
    }
  }
  const env: ValidationEnv = { allowedDrillsBySkill, drillMinutes, drillSkill };

  // Activity digest (compact, no PII)
  const last14 = addDaysISO(todayISO(), -14);
  const digestRows = await db
    .select({
      classType: workouts.classType,
      cnt: sql<number>`count(*)`,
    })
    .from(workouts)
    .where(and(gte(workouts.date, last14), lte(workouts.date, todayISO())))
    .groupBy(workouts.classType);
  const activityDigest = digestRows.map((r) => `${r.classType}: ${r.cnt}`).join(", ") || "(no logged activity)";

  // Pass 2: LLM personalisation
  const goalSummary = buildGoalSummary(answers, selectedCourses.map((c) => c.name));
  const weaknessSignals = await getWeaknessSignalsForUser(userId);
  const { personalisation, llmFallbackUsed, modelUsed } = await personalisePlan({
    goalSummary, weaknessSignals, draft: placements, activityDigest, env,
  });

  // Apply swaps to the placements
  const finalPlacements = placements.map((p) => {
    const swap = personalisation.swaps.find((s) => s.sessionIndex === p.sessionIndex);
    if (swap) return { ...p, drillId: swap.newDrillId, originalDrillId: p.drillId };
    return { ...p, originalDrillId: null as number | null };
  });
  const rationaleBySession = new Map(personalisation.sessionRationales.map((r) => [r.sessionIndex, r.rationale]));

  // Persist
  const generationMeta: GenerationMeta = {
    rulesVersion: RULES_VERSION, llmModel: modelUsed, generatedAt: new Date().toISOString(), llmFallbackUsed,
  };

  const planId = await db.transaction(async (tx) => {
    const [plan] = await tx.insert(customPlans).values({
      userId,
      name: "8-Week Skill Plan",
      goalSummary,
      weeklyDrillSlots: slots,
      selectedSkillIds: skillIds,
      planLengthWeeks: PLAN_LENGTH_WEEKS,
      startsOn,
      endsOn,
      generationMeta,
      updatedAt: new Date(),
    }).returning();

    for (const p of finalPlacements) {
      const drill = allDrills.find((d) => d.id === p.drillId);
      const course = selectedCourses.find((c) => c.id === drill?.courseId);
      if (!drill || !course) continue;
      const [workout] = await tx.insert(workouts).values({
        date: p.plannedDate,
        classType: "CUSTOM",
        title: `${course.name} — ${drill.title}`,
      }).returning();
      // One section holding the drill content
      await tx.insert(workoutSections).values({
        workoutId: workout.id,
        type: "SKILL",
        sortOrder: 0,
        exercises: [],
        wodFormat: "EMOM", // sentinel — triggers isCompletionMode() in WodScoreEntry
        wodScoreType: "INTERVAL", // ditto
        wodName: drill.title,
        wodDescription: drill.movementsSummary,
        wodMovements: drill.sections.flatMap((s: SkillDrillSection) => s.items.map((it) => ({
          name: it.movement, reps: String(it.reps ?? ""), weight: null, unit: null, note: it.notes ?? null,
        }))),
      });
      await tx.insert(customPlanSessions).values({
        planId: plan.id,
        workoutId: workout.id,
        drillId: p.drillId,
        originalDrillId: p.originalDrillId,
        plannedDate: p.plannedDate,
        plannedSlotMinutes: p.plannedSlotMinutes,
        llmRationale: rationaleBySession.get(p.sessionIndex) ?? null,
      });
    }

    await tx.insert(goalQuestionnaires).values({
      userId, planId: plan.id, answers,
    });

    return plan.id;
  });

  revalidatePath("/schedule");
  revalidatePath("/programming");
  return { planId };
}

// Helpers (also at end of actions.ts)

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function buildGoalSummary(a: CreatePlanAnswers, skillNames: string[]): string {
  return `Improving ${skillNames.join(" and ")} over 8 weeks (${a.wodsPerWeek} WODs/wk). ` +
         `Self-rated confidence: rope ${a.ropeConfidence}/5, handstand ${a.handstandConfidence}/5, pull gym ${a.pullGymConfidence}/5.`;
}
```

Also ensure the following imports exist at the top of `src/app/actions.ts` (add only the ones not already present — `eq`, `and`, `sql`, and `auth` are almost certainly already imported for the existing actions):

```ts
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";
import { classifyMovements } from "@/lib/programming/movement-patterns";
```

- [ ] **Step 2: Verify it builds**

Run: `npx tsc --noEmit`

Expected: no errors related to the new code. If there are type errors elsewhere in the file (preexisting), they should already exist on `main`; only fix new ones.

- [ ] **Step 3: Commit**

```bash
git add src/app/actions.ts
git commit -m "feat(actions): createPlan — rules scheduler + Claude personalisation + transactional persist"
```

---

## Task 14: Remaining plan server actions

**Files:**
- Modify: `src/app/actions.ts`

- [ ] **Step 1: Add `getActivePlan`, `swapDrillSession`, `regeneratePlan`, `pausePlan`, `markPlanCompleted`, `getWeaknessSignals`, `markTourSeen`**

Append to `src/app/actions.ts`:

```ts
export async function getActivePlan() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  const [plan] = await db
    .select()
    .from(customPlans)
    .where(and(eq(customPlans.userId, userId), eq(customPlans.status, "active")));
  if (!plan) return null;
  const sessions = await db
    .select({
      session: customPlanSessions,
      drill: skillDrills,
      course: skillCourses,
      workout: workouts,
    })
    .from(customPlanSessions)
    .innerJoin(skillDrills, eq(customPlanSessions.drillId, skillDrills.id))
    .innerJoin(skillCourses, eq(skillDrills.courseId, skillCourses.id))
    .leftJoin(workouts, eq(customPlanSessions.workoutId, workouts.id))
    .where(eq(customPlanSessions.planId, plan.id))
    .orderBy(customPlanSessions.plannedDate);
  return { plan, sessions };
}

export async function getWeaknessSignals() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  return getWeaknessSignalsForUser(userId);
}

export async function swapDrillSession(sessionId: number): Promise<{ newDrillId: number }> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const [session] = await db
    .select({ session: customPlanSessions, drill: skillDrills, plan: customPlans })
    .from(customPlanSessions)
    .innerJoin(skillDrills, eq(customPlanSessions.drillId, skillDrills.id))
    .innerJoin(customPlans, eq(customPlanSessions.planId, customPlans.id))
    .where(and(eq(customPlanSessions.id, sessionId), eq(customPlans.userId, userId)));
  if (!session) throw new Error("Session not found");

  // Pick an alt drill from the same course not already placed in this plan
  const placed = await db
    .select({ drillId: customPlanSessions.drillId })
    .from(customPlanSessions)
    .where(eq(customPlanSessions.planId, session.plan.id));
  const placedIds = new Set(placed.map((p) => p.drillId));
  const alts = await db
    .select()
    .from(skillDrills)
    .where(eq(skillDrills.courseId, session.drill.courseId));
  const alt = alts.find((d) => !placedIds.has(d.id) && d.id !== session.drill.id);
  if (!alt) throw new Error("No alternate drill available in this course");

  await db
    .update(customPlanSessions)
    .set({ drillId: alt.id, originalDrillId: session.drill.id, status: "swapped" })
    .where(eq(customPlanSessions.id, sessionId));

  if (session.session.workoutId) {
    await db
      .update(workouts)
      .set({ title: `${(await db.select({ n: skillCourses.name }).from(skillCourses).where(eq(skillCourses.id, alt.courseId)))[0].n} — ${alt.title}` })
      .where(eq(workouts.id, session.session.workoutId));
  }

  revalidatePath("/schedule");
  revalidatePath("/programming");
  return { newDrillId: alt.id };
}

export async function regeneratePlan(planId: number): Promise<{ planId: number }> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const [old] = await db
    .select()
    .from(customPlans)
    .where(and(eq(customPlans.id, planId), eq(customPlans.userId, userId)));
  if (!old) throw new Error("Plan not found");

  await db.update(customPlans).set({ status: "completed", updatedAt: new Date() }).where(eq(customPlans.id, planId));
  return createPlan(
    { wodsPerWeek: 3, ropeConfidence: 3, handstandConfidence: 3, pullGymConfidence: 3 }, // sane defaults; UI passes the actual answers
    old.weeklyDrillSlots,
    old.selectedSkillIds
  );
}

export async function pausePlan(planId: number): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  await db
    .update(customPlans)
    .set({ status: "paused", updatedAt: new Date() })
    .where(and(eq(customPlans.id, planId), eq(customPlans.userId, userId)));
  revalidatePath("/programming");
}

export async function markPlanCompleted(planId: number): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  await db
    .update(customPlans)
    .set({ status: "completed", updatedAt: new Date() })
    .where(and(eq(customPlans.id, planId), eq(customPlans.userId, userId)));
  revalidatePath("/programming");
}

export async function markTourSeen(tourId: "onboarding-v1" | "custom-programming-v1"): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
  const current: string[] = (profile?.seenTourModules as string[] | undefined) ?? [];
  const next = new Set<string>(current);
  next.add(tourId);
  if (tourId === "onboarding-v1") next.add("custom-programming-v1");
  const seenArray = Array.from(next);

  if (profile) {
    await db
      .update(userProfiles)
      .set({
        seenTourModules: seenArray,
        // Maintain the legacy flag so any old code reading it still works.
        onboardingComplete: tourId === "onboarding-v1" ? true : profile.onboardingComplete,
      })
      .where(eq(userProfiles.userId, userId));
  } else {
    await db.insert(userProfiles).values({
      userId,
      seenTourModules: seenArray,
      onboardingComplete: tourId === "onboarding-v1",
    });
  }
  revalidatePath("/schedule");
}
```

- [ ] **Step 2: Replace the body of the existing `completeOnboarding` with a wrapper**

In `src/app/actions.ts`, find `export async function completeOnboarding()` (around line 392) and replace its body with:

```ts
export async function completeOnboarding() {
  return markTourSeen("onboarding-v1");
}
```

- [ ] **Step 3: Verify it builds**

Run: `npx tsc --noEmit`

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/actions.ts
git commit -m "feat(actions): plan management actions (get/swap/regen/pause/complete) + markTourSeen"
```

---

# Phase D — Calendar integration UI

## Task 15: `ClassTypeTabs` — add CUSTOM

**Files:**
- Modify: `src/components/class-type-tabs.tsx`

- [ ] **Step 1: Add CUSTOM to the list and add the `data-tour` target**

Replace the contents of `src/components/class-type-tabs.tsx` with:

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { ClassType } from "@/db/schema";

const CLASS_TYPES: { value: ClassType; label: string; tourTarget?: string }[] = [
  { value: "BARBELL", label: "BARBELL" },
  { value: "CROSSFIT", label: "CROSSFIT" },
  { value: "CUSTOM", label: "CUSTOM", tourTarget: "class-tabs-custom" },
];

interface ClassTypeTabsProps {
  selected: ClassType;
}

export function ClassTypeTabs({ selected }: ClassTypeTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSelect(classType: ClassType) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("class", classType);
    params.delete("day");
    router.push(`/schedule?${params.toString()}`);
  }

  return (
    <div className="flex gap-1" data-tour="class-tabs">
      {CLASS_TYPES.map((ct) => (
        <button
          key={ct.value}
          data-tour={ct.tourTarget}
          onClick={() => handleSelect(ct.value)}
          className={`flex-1 py-2.5 text-center font-headline text-[11px] font-black uppercase tracking-widest transition-colors ${
            selected === ct.value
              ? "bg-primary-container text-on-primary-fixed"
              : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
          }`}
        >
          {ct.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/class-type-tabs.tsx
git commit -m "feat(ui): add CUSTOM class tab with tour target"
```

---

## Task 16: `CustomDrillDetail` component

**Files:**
- Create: `src/components/custom-drill-detail.tsx`
- Create: `src/components/programming/swap-drill-sheet.tsx`

- [ ] **Step 1: Write the swap-drill-sheet (a thin client component)**

Create `src/components/programming/swap-drill-sheet.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { swapDrillSession } from "@/app/actions";
import { useRouter } from "next/navigation";

interface Props {
  sessionId: number;
}

export function SwapDrillSheet({ sessionId }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSwap() {
    setError(null);
    startTransition(async () => {
      try {
        await swapDrillSession(sessionId);
        setOpen(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Swap failed");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface"
      >
        Swap this session
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-surface-container p-6">
            <h3 className="font-headline text-sm font-black uppercase tracking-widest">Swap drill</h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              We&apos;ll replace this session with the next available drill from the same course.
            </p>
            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={pending}
                className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-on-surface-variant"
              >
                Cancel
              </button>
              <button
                onClick={handleSwap}
                disabled={pending}
                className="flex-1 bg-[#cafd00] py-3 font-headline text-xs font-black uppercase tracking-widest text-black disabled:opacity-50"
              >
                {pending ? "Swapping…" : "Swap"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Write the drill detail component**

Create `src/components/custom-drill-detail.tsx`:

```tsx
import type { workouts, workoutSections, customPlanSessions, skillDrills, skillCourses } from "@/db/schema";
import { WodScoreEntry } from "@/components/wod-score-entry";
import { SwapDrillSheet } from "@/components/programming/swap-drill-sheet";
import Link from "next/link";

type Workout = typeof workouts.$inferSelect;
type Section = typeof workoutSections.$inferSelect;
type Session = typeof customPlanSessions.$inferSelect;
type Drill = typeof skillDrills.$inferSelect;
type Course = typeof skillCourses.$inferSelect;

interface Props {
  workout: Workout;
  sections: Section[];
  session: Session;
  drill: Drill;
  course: Course;
}

export function CustomDrillDetail({ workout, sections, session, drill, course }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
          <Link href={`/programming/skills/${course.slug}`} className="hover:text-on-surface">
            {course.name}
          </Link>
          {" · "}Week {drill.week}, Workout {drill.orderInWeek}
        </p>
        <h2 className="mt-1 font-headline text-2xl font-black uppercase tracking-tight">{drill.title}</h2>
      </div>

      {session.llmRationale && (
        <div className="border-l-2 border-[#cafd00] bg-surface-container px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#cafd00]">Why this session</p>
          <p className="mt-1 text-sm text-on-surface-variant">{session.llmRationale}</p>
        </div>
      )}

      {drill.sections.map((s, i) => (
        <div key={i}>
          <h3 className="font-headline text-xs font-black uppercase tracking-widest text-on-surface-variant">
            {s.name}
          </h3>
          <ul className="mt-2 space-y-1">
            {s.items.map((it, j) => (
              <li key={j} className="text-sm text-on-surface">
                {it.movement}
                {it.reps != null && <span className="text-on-surface-variant"> × {String(it.reps)}</span>}
                {it.minute != null && <span className="text-on-surface-variant"> (min {it.minute})</span>}
                {it.notes && <span className="block text-xs text-on-surface-variant">{it.notes}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {sections.length > 0 && (
        <WodScoreEntry workout={workout} sections={sections} />
      )}

      <div className="flex items-center justify-between border-t border-outline-variant pt-4">
        <SwapDrillSheet sessionId={session.id} />
        <a
          href={course.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface"
        >
          Open on WODprep →
        </a>
      </div>
    </div>
  );
}
```

> **If `WodScoreEntry`'s prop shape differs:** read `src/components/wod-score-entry.tsx` and adapt the prop list. The intent is "reuse the existing completion-mode logging UI" — match its current API exactly rather than inventing a new shape here.

- [ ] **Step 3: Commit**

```bash
git add src/components/custom-drill-detail.tsx src/components/programming/swap-drill-sheet.tsx
git commit -m "feat(ui): CustomDrillDetail + SwapDrillSheet components"
```

---

## Task 17: Wire `CustomDrillDetail` into `workout/[date]/page.tsx`

**Files:**
- Modify: `src/app/(app)/workout/[date]/page.tsx`

- [ ] **Step 1: Read the existing file**

Read `src/app/(app)/workout/[date]/page.tsx`. Locate where `BarbellDetail` / `CrossFitDetail` are rendered (look for `workout.classType === "BARBELL"` and similar).

- [ ] **Step 2: Add the CUSTOM branch**

Add imports near the existing detail-component imports:

```ts
import { CustomDrillDetail } from "@/components/custom-drill-detail";
import { customPlanSessions, skillDrills, skillCourses } from "@/db/schema";
```

In the data-fetching section (where the workout, sections, etc. are loaded server-side), add a sibling query for the plan session linked to this workout, in parallel with the other queries — pattern after the existing parallel pattern in the file:

```ts
const planSessionRows = await db
  .select({
    session: customPlanSessions,
    drill: skillDrills,
    course: skillCourses,
  })
  .from(customPlanSessions)
  .innerJoin(skillDrills, eq(customPlanSessions.drillId, skillDrills.id))
  .innerJoin(skillCourses, eq(skillDrills.courseId, skillCourses.id))
  .where(eq(customPlanSessions.workoutId, workout.id))
  .limit(1);

const planSession = planSessionRows[0] ?? null;
```

In the JSX where the existing detail components are rendered, add the CUSTOM branch alongside the others:

```tsx
{workout.classType === "CUSTOM" && planSession && (
  <CustomDrillDetail
    workout={workout}
    sections={sections}
    session={planSession.session}
    drill={planSession.drill}
    course={planSession.course}
  />
)}
```

- [ ] **Step 3: Verify it builds**

Run: `npx tsc --noEmit`

Expected: no errors related to this file.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/workout/\[date\]/page.tsx
git commit -m "feat(ui): render CustomDrillDetail for CUSTOM workouts on /workout/[date]"
```

---

# Phase E — Programming routes

## Task 18: `/programming` overview route + `ActivePlanOverview` component

**Files:**
- Create: `src/app/(app)/programming/page.tsx`
- Create: `src/components/programming/active-plan-overview.tsx`

- [ ] **Step 1: Read the Next.js docs for the routing/page-component pattern**

Read `node_modules/next/dist/docs/` (the `app-router` or `pages` section) for the current API for a server-component `page.tsx`. Match the existing patterns at `src/app/(app)/schedule/page.tsx` and `src/app/(app)/workout/[date]/page.tsx`.

- [ ] **Step 2: Write the page**

Create `src/app/(app)/programming/page.tsx`:

```tsx
import { getActivePlan } from "@/app/actions";
import { ActivePlanOverview } from "@/components/programming/active-plan-overview";
import Link from "next/link";

export default async function ProgrammingPage() {
  const data = await getActivePlan();

  if (!data) {
    return (
      <div className="px-4 py-10">
        <div className="mx-auto max-w-md text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#cafd00]">CUSTOM PROGRAMMING</p>
          <h1 className="mt-3 font-headline text-3xl font-black uppercase tracking-tight">
            BUILD YOUR SKILL PLAN
          </h1>
          <p className="mt-4 text-sm text-on-surface-variant">
            Pick the skills you want to work on — we&apos;ll weave them into your week around your existing classes.
          </p>
          <Link
            href="/programming/new"
            data-tour="programming-cta"
            className="mt-6 inline-block bg-[#cafd00] px-6 py-3.5 font-headline text-sm font-black uppercase tracking-widest text-black"
          >
            START YOUR FIRST PLAN
          </Link>
        </div>
      </div>
    );
  }

  return <ActivePlanOverview plan={data.plan} sessions={data.sessions} />;
}
```

- [ ] **Step 3: Write the overview component**

Create `src/components/programming/active-plan-overview.tsx`:

```tsx
"use client";

import { useTransition } from "react";
import Link from "next/link";
import { regeneratePlan, pausePlan, markPlanCompleted } from "@/app/actions";
import { useRouter } from "next/navigation";
import type { customPlans, customPlanSessions, skillDrills, skillCourses, workouts } from "@/db/schema";

type Plan = typeof customPlans.$inferSelect;
type SessionRow = {
  session: typeof customPlanSessions.$inferSelect;
  drill: typeof skillDrills.$inferSelect;
  course: typeof skillCourses.$inferSelect;
  workout: typeof workouts.$inferSelect | null;
};

interface Props {
  plan: Plan;
  sessions: SessionRow[];
}

export function ActivePlanOverview({ plan, sessions }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = sessions.filter((s) => (s.workout?.date as unknown as string) >= today).slice(0, 7);

  const progressByCourse = new Map<number, { name: string; done: number; total: number }>();
  for (const s of sessions) {
    const m = progressByCourse.get(s.course.id) ?? { name: s.course.name, done: 0, total: 0 };
    m.total += 1;
    if (s.session.status === "completed") m.done += 1;
    progressByCourse.set(s.course.id, m);
  }

  function handle(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  const fallbackBanner = (plan.generationMeta as { llmFallbackUsed?: boolean })?.llmFallbackUsed;

  return (
    <div className="space-y-6 px-4 py-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#cafd00]">YOUR PLAN</p>
        <h1 className="mt-1 font-headline text-2xl font-black uppercase tracking-tight">{plan.name}</h1>
        <p className="mt-1 text-xs text-on-surface-variant">
          {plan.startsOn} → {plan.endsOn} · {plan.status.toUpperCase()}
        </p>
      </div>

      {fallbackBanner && (
        <div className="border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
          AI personalisation wasn&apos;t available when this plan was generated — you can regenerate to retry.
        </div>
      )}

      <section>
        <h2 className="font-headline text-xs font-black uppercase tracking-widest text-on-surface-variant">
          Next 7 days
        </h2>
        <ul className="mt-2 space-y-1">
          {upcoming.length === 0 && <li className="text-sm text-on-surface-variant">No upcoming sessions</li>}
          {upcoming.map((s) => (
            <li key={s.session.id} className="flex items-center justify-between border-b border-outline-variant py-2">
              <div>
                <p className="text-sm">{s.drill.title}</p>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                  {s.workout?.date as unknown as string} · {s.course.name}
                </p>
              </div>
              {s.workout && (
                <Link
                  href={`/workout/${s.workout.date}?class=CUSTOM`}
                  className="text-[10px] font-bold uppercase tracking-widest text-[#cafd00]"
                >
                  Open
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-headline text-xs font-black uppercase tracking-widest text-on-surface-variant">Progress</h2>
        <ul className="mt-2 space-y-1">
          {Array.from(progressByCourse.values()).map((p) => (
            <li key={p.name} className="flex items-center justify-between py-1">
              <span className="text-sm">{p.name}</span>
              <span className="text-xs text-on-surface-variant">{p.done}/{p.total} ({Math.round((p.done / p.total) * 100)}%)</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2 border-t border-outline-variant pt-4">
        <button
          onClick={() => handle(() => regeneratePlan(plan.id))}
          disabled={pending}
          className="bg-[#cafd00] py-3 font-headline text-xs font-black uppercase tracking-widest text-black disabled:opacity-50"
        >
          {pending ? "…" : "REGENERATE PLAN"}
        </button>
        <button
          onClick={() => handle(() => pausePlan(plan.id))}
          disabled={pending || plan.status !== "active"}
          className="py-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant disabled:opacity-50"
        >
          Pause
        </button>
        <button
          onClick={() => handle(() => markPlanCompleted(plan.id))}
          disabled={pending}
          className="py-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant disabled:opacity-50"
        >
          Mark as completed
        </button>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit`

Expected: no errors related to this file.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/programming/page.tsx src/components/programming/active-plan-overview.tsx
git commit -m "feat(ui): /programming overview + empty-state CTA"
```

---

## Task 19: Wizard skeleton (`wizard.tsx` + page route)

**Files:**
- Create: `src/app/(app)/programming/new/page.tsx`
- Create: `src/components/programming/wizard.tsx`

- [ ] **Step 1: Write the route**

Create `src/app/(app)/programming/new/page.tsx`:

```tsx
import { getWeaknessSignals } from "@/app/actions";
import { db } from "@/db";
import { skillCourses } from "@/db/schema";
import { Wizard } from "@/components/programming/wizard";

export default async function NewProgrammingPage() {
  const [signals, courses] = await Promise.all([
    getWeaknessSignals(),
    db.select().from(skillCourses).orderBy(skillCourses.category, skillCourses.difficulty),
  ]);
  return <Wizard initialSignals={signals} courses={courses} />;
}
```

- [ ] **Step 2: Write the wizard skeleton**

Create `src/components/programming/wizard.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPlan } from "@/app/actions";
import type { skillCourses, WeeklyDrillSlot } from "@/db/schema";
import type { WeaknessSignal } from "@/lib/programming/types";
import { StartingPointStep } from "./wizard-step-1-starting-point";
import { SkillsStep } from "./wizard-step-2-skills";
import { SlotsStep } from "./wizard-step-3-slots";
import { LengthStep } from "./wizard-step-4-length";
import { ReviewStep } from "./wizard-step-5-review";

type Course = typeof skillCourses.$inferSelect;

interface Props {
  initialSignals: WeaknessSignal[];
  courses: Course[];
}

export interface WizardState {
  step: 1 | 2 | 3 | 4 | 5;
  wodsPerWeek: number;
  ropeConfidence: number;
  handstandConfidence: number;
  pullGymConfidence: number;
  selectedSkillIds: number[];
  slots: WeeklyDrillSlot[];
}

export function Wizard({ initialSignals, courses }: Props) {
  const [state, setState] = useState<WizardState>({
    step: 1,
    wodsPerWeek: 3,
    ropeConfidence: 3,
    handstandConfidence: 3,
    pullGymConfidence: 3,
    selectedSkillIds: initialSignals.slice(0, 3).map((s) => s.skillId),
    slots: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function set<K extends keyof WizardState>(k: K, v: WizardState[K]) {
    setState((s) => ({ ...s, [k]: v }));
  }

  function commit() {
    setError(null);
    startTransition(async () => {
      try {
        const { planId } = await createPlan(
          {
            wodsPerWeek: state.wodsPerWeek,
            ropeConfidence: state.ropeConfidence,
            handstandConfidence: state.handstandConfidence,
            pullGymConfidence: state.pullGymConfidence,
          },
          state.slots,
          state.selectedSkillIds
        );
        router.push(`/programming?planId=${planId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create plan");
      }
    });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-on-surface-variant">
        STEP {state.step} OF 5
      </p>
      <div className="mt-4">
        {state.step === 1 && (
          <StartingPointStep
            state={state}
            onChange={set}
            onNext={() => setState((s) => ({ ...s, step: 2 }))}
          />
        )}
        {state.step === 2 && (
          <SkillsStep
            state={state}
            courses={courses}
            signals={initialSignals}
            onChange={set}
            onBack={() => setState((s) => ({ ...s, step: 1 }))}
            onNext={() => setState((s) => ({ ...s, step: 3 }))}
          />
        )}
        {state.step === 3 && (
          <SlotsStep
            state={state}
            onChange={set}
            onBack={() => setState((s) => ({ ...s, step: 2 }))}
            onNext={() => setState((s) => ({ ...s, step: 4 }))}
          />
        )}
        {state.step === 4 && (
          <LengthStep
            state={state}
            onBack={() => setState((s) => ({ ...s, step: 3 }))}
            onNext={() => setState((s) => ({ ...s, step: 5 }))}
          />
        )}
        {state.step === 5 && (
          <ReviewStep
            state={state}
            courses={courses}
            onBack={() => setState((s) => ({ ...s, step: 4 }))}
            onCommit={commit}
            pending={pending}
          />
        )}
      </div>
      {error && <p className="mt-4 text-xs text-red-400">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/programming/new/page.tsx src/components/programming/wizard.tsx
git commit -m "feat(ui): wizard route + state machine skeleton"
```

---

## Task 20: Wizard step 1 — Starting point

**Files:**
- Create: `src/components/programming/wizard-step-1-starting-point.tsx`

- [ ] **Step 1: Write the step**

Create `src/components/programming/wizard-step-1-starting-point.tsx`:

```tsx
"use client";

import type { WizardState } from "./wizard";

interface Props {
  state: WizardState;
  onChange: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
  onNext: () => void;
}

function Slider({
  label, value, onChange,
}: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-sm">{label}</label>
        <span className="font-headline text-sm font-black text-[#cafd00]">{value}/5</span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full"
      />
    </div>
  );
}

export function StartingPointStep({ state, onChange, onNext }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-black uppercase tracking-tight">WHERE ARE YOU AT?</h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          Rate yourself honestly — we&apos;ll use this to pace the plan.
        </p>
      </div>

      <div>
        <label className="text-sm">WODs per week</label>
        <input
          type="number"
          min={1}
          max={7}
          value={state.wodsPerWeek}
          onChange={(e) => onChange("wodsPerWeek", Number(e.target.value))}
          className="mt-2 w-full bg-surface-container px-3 py-2 text-sm"
        />
      </div>

      <Slider label="Rope work" value={state.ropeConfidence} onChange={(v) => onChange("ropeConfidence", v)} />
      <Slider label="Handstands" value={state.handstandConfidence} onChange={(v) => onChange("handstandConfidence", v)} />
      <Slider label="Pull gymnastics" value={state.pullGymConfidence} onChange={(v) => onChange("pullGymConfidence", v)} />

      <button
        onClick={onNext}
        className="w-full bg-[#cafd00] py-3.5 font-headline text-sm font-black uppercase tracking-widest text-black"
      >
        NEXT
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/programming/wizard-step-1-starting-point.tsx
git commit -m "feat(ui): wizard step 1 — starting point"
```

---

## Task 21: Wizard step 2 — Skills (with weakness suggestions)

**Files:**
- Create: `src/components/programming/wizard-step-2-skills.tsx`

- [ ] **Step 1: Write the step**

Create `src/components/programming/wizard-step-2-skills.tsx`:

```tsx
"use client";

import type { WizardState } from "./wizard";
import type { WeaknessSignal } from "@/lib/programming/types";
import type { skillCourses } from "@/db/schema";

type Course = typeof skillCourses.$inferSelect;

interface Props {
  state: WizardState;
  courses: Course[];
  signals: WeaknessSignal[];
  onChange: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function SkillsStep({ state, courses, signals, onChange, onBack, onNext }: Props) {
  const reasonBySkill = new Map(signals.map((s) => [s.skillId, s.reason] as const));

  function toggle(id: number) {
    const next = state.selectedSkillIds.includes(id)
      ? state.selectedSkillIds.filter((x) => x !== id)
      : [...state.selectedSkillIds, id];
    if (next.length > 5) return;
    onChange("selectedSkillIds", next);
  }

  const grouped = new Map<string, Course[]>();
  for (const c of courses) {
    const arr = grouped.get(c.category) ?? [];
    arr.push(c);
    grouped.set(c.category, arr);
  }

  const topReasons = signals.slice(0, 2);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-black uppercase tracking-tight">WHAT TO IMPROVE</h2>
        <p className="mt-2 text-sm text-on-surface-variant">Pick 2–5 skills. Suggestions pre-ticked.</p>
      </div>

      {topReasons.length > 0 && (
        <div className="border-l-2 border-[#cafd00] bg-surface-container px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#cafd00]">Why these?</p>
          <ul className="mt-1 space-y-1 text-xs text-on-surface-variant">
            {topReasons.map((s) => (<li key={s.skillId}>· {s.reason}</li>))}
          </ul>
        </div>
      )}

      {Array.from(grouped.entries()).map(([category, list]) => (
        <div key={category}>
          <h3 className="font-headline text-xs font-black uppercase tracking-widest text-on-surface-variant">
            {category.replace(/_/g, " ")}
          </h3>
          <ul className="mt-2 space-y-1">
            {list.map((c) => {
              const checked = state.selectedSkillIds.includes(c.id);
              const reason = reasonBySkill.get(c.id);
              return (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-start gap-3 border-b border-outline-variant py-2">
                    <input type="checkbox" checked={checked} onChange={() => toggle(c.id)} className="mt-1" />
                    <div className="flex-1">
                      <p className="text-sm">{c.name}</p>
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                        difficulty {c.difficulty}/5 · ~{c.estimatedSessionMinutes}min
                      </p>
                      {reason && <p className="mt-1 text-xs text-[#cafd00]">★ {reason}</p>}
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="flex gap-2">
        <button onClick={onBack} className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          BACK
        </button>
        <button
          onClick={onNext}
          disabled={state.selectedSkillIds.length === 0}
          className="flex-[2] bg-[#cafd00] py-3.5 font-headline text-sm font-black uppercase tracking-widest text-black disabled:opacity-50"
        >
          NEXT ({state.selectedSkillIds.length}/5)
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/programming/wizard-step-2-skills.tsx
git commit -m "feat(ui): wizard step 2 — skill picker with weakness suggestions"
```

---

## Task 22: Wizard step 3 — Slots

**Files:**
- Create: `src/components/programming/wizard-step-3-slots.tsx`

- [ ] **Step 1: Write the step**

Create `src/components/programming/wizard-step-3-slots.tsx`:

```tsx
"use client";

import type { WizardState } from "./wizard";
import type { WeeklyDrillSlot } from "@/db/schema";

const DOWS: WeeklyDrillSlot["dow"][] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const WHENS: WeeklyDrillSlot["when"][] = ["before_class", "after_class", "open_gym"];
const MINUTES: WeeklyDrillSlot["minutes"][] = [15, 30, 45, 60];

interface Props {
  state: WizardState;
  onChange: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function SlotsStep({ state, onChange, onBack, onNext }: Props) {
  function addSlot(dow: WeeklyDrillSlot["dow"]) {
    onChange("slots", [...state.slots, { dow, when: "after_class", minutes: 30 }]);
  }

  function updateSlot(i: number, patch: Partial<WeeklyDrillSlot>) {
    onChange("slots", state.slots.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function removeSlot(i: number) {
    onChange("slots", state.slots.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-black uppercase tracking-tight">WHEN CAN YOU TRAIN?</h2>
        <p className="mt-2 text-sm text-on-surface-variant">Tap a day to add a slot.</p>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DOWS.map((dow) => (
          <button
            key={dow}
            onClick={() => addSlot(dow)}
            className="flex flex-col items-center bg-surface-container py-3 text-[10px] font-bold uppercase tracking-widest"
          >
            <span>{dow}</span>
            <span className="text-[#cafd00]">+{state.slots.filter((s) => s.dow === dow).length}</span>
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {state.slots.map((s, i) => (
          <li key={i} className="flex items-center gap-2 border-b border-outline-variant py-2">
            <span className="w-10 text-xs font-bold uppercase">{s.dow}</span>
            <select
              value={s.when}
              onChange={(e) => updateSlot(i, { when: e.target.value as WeeklyDrillSlot["when"] })}
              className="flex-1 bg-surface-container px-2 py-1 text-xs"
            >
              {WHENS.map((w) => (<option key={w} value={w}>{w.replace(/_/g, " ")}</option>))}
            </select>
            <select
              value={s.minutes}
              onChange={(e) => updateSlot(i, { minutes: Number(e.target.value) as WeeklyDrillSlot["minutes"] })}
              className="w-20 bg-surface-container px-2 py-1 text-xs"
            >
              {MINUTES.map((m) => (<option key={m} value={m}>{m}min</option>))}
            </select>
            <button onClick={() => removeSlot(i)} className="text-xs text-on-surface-variant">×</button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <button onClick={onBack} className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          BACK
        </button>
        <button
          onClick={onNext}
          disabled={state.slots.length === 0}
          className="flex-[2] bg-[#cafd00] py-3.5 font-headline text-sm font-black uppercase tracking-widest text-black disabled:opacity-50"
        >
          NEXT
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/programming/wizard-step-3-slots.tsx
git commit -m "feat(ui): wizard step 3 — slot picker"
```

---

## Task 23: Wizard steps 4 + 5 — Length + Review

**Files:**
- Create: `src/components/programming/wizard-step-4-length.tsx`
- Create: `src/components/programming/wizard-step-5-review.tsx`

- [ ] **Step 1: Write step 4**

Create `src/components/programming/wizard-step-4-length.tsx`:

```tsx
"use client";

import type { WizardState } from "./wizard";

interface Props {
  state: WizardState;
  onBack: () => void;
  onNext: () => void;
}

export function LengthStep({ onBack, onNext }: Props) {
  const today = new Date();
  const ends = new Date(today);
  ends.setDate(ends.getDate() + 8 * 7 - 1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-black uppercase tracking-tight">PLAN LENGTH</h2>
        <p className="mt-2 text-sm text-on-surface-variant">Fixed at 8 weeks for now — configurable lengths coming soon.</p>
      </div>

      <div className="bg-surface-container p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">DURATION</p>
        <p className="mt-1 font-headline text-3xl font-black">8 WEEKS</p>
        <p className="mt-2 text-xs text-on-surface-variant">
          Today → {ends.toISOString().slice(0, 10)}
        </p>
      </div>

      <div className="flex gap-2">
        <button onClick={onBack} className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          BACK
        </button>
        <button onClick={onNext} className="flex-[2] bg-[#cafd00] py-3.5 font-headline text-sm font-black uppercase tracking-widest text-black">
          NEXT
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write step 5**

Create `src/components/programming/wizard-step-5-review.tsx`:

```tsx
"use client";

import type { WizardState } from "./wizard";
import type { skillCourses } from "@/db/schema";

type Course = typeof skillCourses.$inferSelect;

interface Props {
  state: WizardState;
  courses: Course[];
  onBack: () => void;
  onCommit: () => void;
  pending: boolean;
}

export function ReviewStep({ state, courses, onBack, onCommit, pending }: Props) {
  const selectedCourses = courses.filter((c) => state.selectedSkillIds.includes(c.id));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-black uppercase tracking-tight">REVIEW & GENERATE</h2>
        <p className="mt-2 text-sm text-on-surface-variant">Looks good? We&apos;ll build the plan now.</p>
      </div>

      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">SKILLS</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {selectedCourses.map((c) => (<li key={c.id}>· {c.name}</li>))}
        </ul>
      </section>

      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">SLOTS</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {state.slots.map((s, i) => (
            <li key={i}>· {s.dow} {s.when.replace(/_/g, " ")} — {s.minutes}min</li>
          ))}
        </ul>
      </section>

      <div className="flex gap-2">
        <button onClick={onBack} disabled={pending} className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-on-surface-variant disabled:opacity-50">
          BACK
        </button>
        <button
          onClick={onCommit}
          disabled={pending}
          className="flex-[2] bg-[#cafd00] py-3.5 font-headline text-sm font-black uppercase tracking-widest text-black disabled:opacity-50"
        >
          {pending ? "GENERATING…" : "GENERATE PLAN"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/programming/wizard-step-4-length.tsx src/components/programming/wizard-step-5-review.tsx
git commit -m "feat(ui): wizard steps 4 + 5 — length and review"
```

---

## Task 24: `/programming/skills/[slug]` read-only course browse

**Files:**
- Create: `src/app/(app)/programming/skills/[slug]/page.tsx`

- [ ] **Step 1: Write the route**

Create `src/app/(app)/programming/skills/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { db } from "@/db";
import { skillCourses, skillDrills } from "@/db/schema";
import { eq } from "drizzle-orm";

interface Params { slug: string }

export default async function SkillCoursePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const [course] = await db.select().from(skillCourses).where(eq(skillCourses.slug, slug));
  if (!course) notFound();
  const drills = await db
    .select()
    .from(skillDrills)
    .where(eq(skillDrills.courseId, course.id))
    .orderBy(skillDrills.week, skillDrills.orderInWeek);

  return (
    <div className="px-4 py-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-on-surface-variant">{course.category.replace(/_/g, " ")}</p>
      <h1 className="mt-1 font-headline text-2xl font-black uppercase tracking-tight">{course.name}</h1>
      <p className="mt-2 text-xs text-on-surface-variant">
        {course.totalWeeks} weeks · difficulty {course.difficulty}/5 · ~{course.estimatedSessionMinutes}min/session
      </p>

      <ul className="mt-6 space-y-2">
        {drills.map((d) => (
          <li key={d.id} className="border-b border-outline-variant py-2">
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">WEEK {d.week}</p>
            <p className="text-sm">{d.title}</p>
            <p className="text-xs text-on-surface-variant">{d.movementsSummary}</p>
          </li>
        ))}
      </ul>

      <a
        href={course.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface"
      >
        Open on WODprep →
      </a>
    </div>
  );
}
```

> **Verify the Next 16 params shape:** `params: Promise<…>` is the current pattern; if Next docs at `node_modules/next/dist/docs/` show otherwise, match that.

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/programming/skills/\[slug\]/page.tsx
git commit -m "feat(ui): /programming/skills/[slug] read-only browse"
```

---

# Phase F — Tour refactor + content

## Task 25: Tour component refactor — `TOURS` map + `tourId` prop

**Files:**
- Modify: `src/components/onboarding-tour.tsx`

- [ ] **Step 1: Refactor**

Replace the entirety of `src/components/onboarding-tour.tsx` with:

```tsx
"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { markTourSeen } from "@/app/actions";
import { useRouter } from "next/navigation";
import type { TourId } from "@/lib/programming/types";

interface TourStep {
  target: string;
  title: string;
  body: string;
  position: "top" | "bottom";
}

const TOURS: Record<TourId, TourStep[]> = {
  "onboarding-v1": [
    {
      target: "class-tabs",
      title: "SWITCH CLASS TYPE",
      body: "Tap here to switch between Barbell, CrossFit, and your Custom programming. Each has its own workouts.",
      position: "bottom",
    },
    {
      target: "workout-card",
      title: "YOUR WORKOUT",
      body: "Tap a workout to open it. You’ll see your programmed sets, percentages, and can log every lift.",
      position: "top",
    },
    {
      target: "nav-progress",
      title: "TRACK PROGRESS",
      body: "Check your strength levels, PR history, and how you stack up against established standards.",
      position: "top",
    },
    {
      target: "nav-profile",
      title: "SET UP PROFILE",
      body: "Enter your name, bodyweight, and sex to unlock personalised standards and the leaderboard.",
      position: "top",
    },
    {
      target: "class-tabs-custom",
      title: "NEW: CUSTOM PROGRAMMING",
      body: "Build a personalised 8-week skill plan around your classes — double unders, muscle ups, handstands.",
      position: "bottom",
    },
  ],
  "custom-programming-v1": [
    {
      target: "class-tabs-custom",
      title: "NEW: CUSTOM PROGRAMMING",
      body: "Build a personalised 8-week skill plan around your classes.",
      position: "bottom",
    },
    {
      target: "programming-cta",
      title: "START YOUR FIRST PLAN",
      body: "Pick the skills you want to work on — we’ll weave them into your week.",
      position: "top",
    },
  ],
};

interface Rect { top: number; left: number; width: number; height: number }

interface Props {
  tourId: TourId;
}

export function OnboardingTour({ tourId }: Props) {
  const STEPS = TOURS[tourId];
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [isPending, startTransition] = useTransition();
  const [started, setStarted] = useState(false);
  const router = useRouter();

  const PAD = 6;

  const measureTarget = useCallback(() => {
    if (!started) return;
    const current = STEPS[step];
    const el = document.querySelector(`[data-tour="${current.target}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      setTargetRect({
        top: r.top - PAD,
        left: r.left - PAD,
        width: r.width + PAD * 2,
        height: r.height + PAD * 2,
      });
    } else {
      setTargetRect(null);
    }
  }, [step, started, STEPS]);

  useEffect(() => {
    const raf = requestAnimationFrame(measureTarget);
    window.addEventListener("resize", measureTarget);
    window.addEventListener("scroll", measureTarget, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measureTarget);
      window.removeEventListener("scroll", measureTarget, true);
    };
  }, [measureTarget]);

  function finish() {
    startTransition(async () => {
      await markTourSeen(tourId);
      router.refresh();
    });
  }

  function handleNext() {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  }

  if (!started) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
        <div className="flex w-full max-w-sm flex-col items-center gap-6 bg-surface-container px-8 pb-8 pt-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center bg-[#cafd00]/20">
            <span className="material-symbols-outlined text-4xl text-[#cafd00]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {tourId === "onboarding-v1" ? "waving_hand" : "auto_awesome"}
            </span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#cafd00]">
              {tourId === "onboarding-v1" ? "YOUR TRAINING COMPANION" : "WHAT’S NEW"}
            </p>
            <h2 className="mt-2 font-headline text-2xl font-black uppercase tracking-tight text-on-surface">
              {tourId === "onboarding-v1" ? "WELCOME TO THE YARD" : "CUSTOM PROGRAMMING IS HERE"}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
              {tourId === "onboarding-v1"
                ? "Let us show you around. We’ll highlight the key areas so you know exactly where everything is."
                : "Quick tour of the new skill-programming track — under a minute."}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <button
              onClick={() => setStarted(true)}
              className="squishy w-full bg-[#cafd00] py-3.5 font-headline text-sm font-black uppercase tracking-widest text-black transition-transform duration-150 active:scale-95"
            >
              {tourId === "onboarding-v1" ? "TAKE THE TOUR" : "SHOW ME"}
            </button>
            <button
              onClick={finish}
              disabled={isPending}
              className="py-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant transition-colors hover:text-on-surface disabled:opacity-50"
            >
              SKIP
            </button>
          </div>
        </div>
      </div>
    );
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const tooltipStyle: React.CSSProperties = {};
  if (targetRect) {
    if (current.position === "bottom") {
      tooltipStyle.top = targetRect.top + targetRect.height + 12;
      tooltipStyle.left = 16;
      tooltipStyle.right = 16;
    } else {
      tooltipStyle.bottom = window.innerHeight - targetRect.top + 12;
      tooltipStyle.left = 16;
      tooltipStyle.right = 16;
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect x={targetRect.left} y={targetRect.top} width={targetRect.width} height={targetRect.height} rx="4" fill="black" />
            )}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.75)" mask="url(#tour-mask)" />
      </svg>

      {targetRect && (
        <div
          className="absolute rounded border-2 border-[#cafd00] transition-all duration-300"
          style={{ top: targetRect.top, left: targetRect.left, width: targetRect.width, height: targetRect.height, pointerEvents: "none" }}
        />
      )}

      <div className="absolute z-10 flex flex-col gap-3 bg-surface-container-high p-5 shadow-2xl transition-all duration-300" style={tooltipStyle}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-headline text-sm font-black uppercase tracking-tight text-[#cafd00]">{current.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{current.body}</p>
          </div>
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-outline">
            {step + 1}/{STEPS.length}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={finish}
            disabled={isPending}
            className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface disabled:opacity-50"
          >
            SKIP
          </button>
          <button
            onClick={handleNext}
            disabled={isPending}
            className="squishy bg-[#cafd00] px-5 py-2 font-headline text-xs font-black uppercase tracking-widest text-black transition-transform duration-150 disabled:opacity-50 active:scale-95"
          >
            {isPending ? "..." : isLast ? "DONE" : "NEXT"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/onboarding-tour.tsx
git commit -m "feat(tour): generalise OnboardingTour to multiple tour modules"
```

---

## Task 26: Wire `pickNextTour` into the schedule page

**Files:**
- Modify: `src/app/(app)/schedule/page.tsx`

- [ ] **Step 1: Read the existing trigger**

Read `src/app/(app)/schedule/page.tsx` around lines 130-140 (the existing tour trigger).

- [ ] **Step 2: Replace the trigger**

Replace:

```tsx
const showOnboarding = !profile?.onboardingComplete;
// ...
{showOnboarding && <OnboardingTour />}
```

with:

```tsx
import { pickNextTour } from "@/lib/programming/tour";

// ... inside the component, near the existing profile read ...
const seenModules = (profile?.seenTourModules as string[] | undefined) ?? [];
const nextTour = pickNextTour(seenModules, profile?.onboardingComplete ?? false);

// ... in the JSX, replace the existing tour render ...
{nextTour && <OnboardingTour tourId={nextTour} />}
```

(Keep the existing `import { OnboardingTour } from "@/components/onboarding-tour";`.)

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/schedule/page.tsx
git commit -m "feat(tour): switch schedule page to versioned pickNextTour"
```

---

## Task 27: Run the full test suite + smoke verify

**Files:** None modified.

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`

Expected: all programming tests PASS. Pre-existing tests should also still pass — if any fail and they don't reference programming/tour code, leave them alone (they were already broken on `main`).

- [ ] **Step 2: Type-check the whole project**

Run: `npx tsc --noEmit`

Expected: zero errors related to anything in `src/lib/programming/`, `src/components/programming/`, `src/components/custom-drill-detail.tsx`, `src/components/onboarding-tour.tsx`, `src/app/actions.ts` (new sections), `src/app/(app)/programming/**`, `src/app/(app)/schedule/page.tsx`, `src/db/schema.ts`.

- [ ] **Step 3: Manual smoke (dev server)**

Run: `npm run dev`

In the browser, with a Clerk-authed test user:

1. Visit `/programming` — verify the empty-state CTA renders.
2. Click "START YOUR FIRST PLAN" → wizard renders step 1.
3. Step through all 5 steps with 2 skills + 3 slots/week → click GENERATE.
4. Verify redirect to `/programming?planId=…` and the overview shows ~16+ sessions over the 8-week window.
5. Visit `/schedule` and switch to the CUSTOM tab — verify drill sessions appear on planned dates.
6. Open one session (`/workout/[date]?class=CUSTOM`) — verify `CustomDrillDetail` renders with course context + sections + a logging panel.
7. Log a completion.
8. As a user with `onboardingComplete=true` and `seenTourModules` NOT containing `custom-programming-v1`, refresh the schedule page — confirm the spotlight fires. Complete it. Refresh again — confirm it does NOT fire.
9. As a brand-new user (`onboardingComplete=false`), confirm the onboarding tour fires (now with the extra "NEW: CUSTOM PROGRAMMING" step at the end). Complete it. Confirm the spotlight does NOT then fire (because `markTourSeenLocal` for `onboarding-v1` also marks `custom-programming-v1`).

- [ ] **Step 4: Final commit (if any smoke fixes were needed)**

If steps 1-9 surfaced any issues, fix them inline and commit per-fix. Otherwise no commit needed — the feature ships as-is.

```bash
# example, if a smoke fix was needed:
git add <changed files>
git commit -m "fix(<area>): <what>"
```

---

## Self-Review Checklist (run before handing off)

After writing all tasks above, re-read the spec and confirm:

- [ ] **Schema coverage:** `skill_courses`, `skill_drills`, `custom_plans`, `custom_plan_sessions`, `goal_questionnaires`, `userProfiles.seenTourModules`, `CUSTOM` enum value — all in Task 1 + Task 6.
- [ ] **Ingest:** JSON copy (Task 2), curation (Task 3), seed script (Task 5), classifier (Task 4).
- [ ] **Weakness inference:** Task 8 — all 4 spec signals wired (pure functions + DB-backed `getWeaknessSignalsForUser` covering movement-gap, RPE, frequency, completion).
- [ ] **Rules scheduler:** Task 9.
- [ ] **LLM personalisation + validator:** Tasks 10, 11.
- [ ] **Server actions:** `createPlan` (Task 13), `getActivePlan` / `swapDrillSession` / `regeneratePlan` / `pausePlan` / `markPlanCompleted` / `getWeaknessSignals` / `markTourSeen` (Task 14), `completeOnboarding` wrapper (Task 14).
- [ ] **Calendar integration:** `ClassTypeTabs` CUSTOM tab (Task 15), `CustomDrillDetail` (Task 16), `workout/[date]/page.tsx` branch (Task 17).
- [ ] **Programming routes:** `/programming` (Task 18), `/programming/new` wizard (Tasks 19-23), `/programming/skills/[slug]` (Task 24).
- [ ] **Tour:** component refactor (Task 25), trigger (Task 26), `pickNextTour` (Task 12 — pure helper).
- [ ] **Tests:** movement-patterns, weakness, scheduler, validator, tour — all TDD-driven with failing-first tests.
- [ ] **Smoke pass:** Task 27.
- [ ] **No placeholders:** every code block is complete; every command shows expected output.
- [ ] **Spec out-of-scope items NOT in plan:** adaptive re-planning, configurable plan lengths, plan sharing, PR tracking surface, admin UI for catalogue, other course providers — none of these appear as tasks.

---
