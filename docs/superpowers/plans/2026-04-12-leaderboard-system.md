# Leaderboard System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the simple 1RM leaderboard with a two-tab (Barbell/CrossFit) system featuring inline WOD leaderboards, tier-based CrossFit rankings, and per-WOD drill-down pages.

**Architecture:** Server-first with Next.js Server Actions and Server Components. Schema migration adds `rxLevel` enum and `public` boolean to `wodResults`, replacing the `rx` boolean. Three new UI surfaces compose from shared server actions and a new score comparison utility. The existing leaderboard page becomes tabbed, and the workout detail page gains an inline leaderboard after WOD score logging.

**Tech Stack:** Next.js 16 (App Router, Server Components, Server Actions), Drizzle ORM + Neon Postgres, TypeScript, Tailwind CSS 4, existing app design system (Kinetic Brutalism).

**Spec:** `docs/superpowers/specs/2026-04-12-leaderboard-system-design.md`

---

## File Structure

### New files
- `src/lib/wod-scoring.ts` — score parsing, comparison, and composite score calculation
- `src/components/inline-wod-leaderboard.tsx` — Surface 1: mini leaderboard shown after logging a WOD score
- `src/components/rx-level-tabs.tsx` — shared Scaled/RX/RX+ segmented control used across all surfaces
- `src/components/tier-ladder.tsx` — vertical tier progression visualisation
- `src/components/crossfit-leaderboard.tsx` — Surface 2: CrossFit tab content (tier rankings + browse WODs)
- `src/components/wod-drilldown.tsx` — Surface 3: per-WOD leaderboard detail
- `src/app/(app)/leaderboard/wod/[wodName]/page.tsx` — Surface 3 route

### Modified files
- `src/db/schema.ts` — add `RxLevel` type, update `wodResults` table
- `src/app/actions.ts` — update existing actions, add new leaderboard actions
- `src/components/wod-score-entry.tsx` — replace RX checkbox with Scaled/RX/RX+ tabs, add public toggle, show inline leaderboard after logging
- `src/app/(app)/leaderboard/page.tsx` — add Barbell/CrossFit tabs
- `src/app/(app)/workout/[date]/page.tsx` — pass new props to WodScoreEntry

---

## Task 1: Schema Migration — Add RxLevel and Public Fields

**Files:**
- Modify: `src/db/schema.ts:40,121-135`

- [ ] **Step 1: Add RxLevel type and update wodResults table**

In `src/db/schema.ts`, add the `RxLevel` type after `WodScoreType` (line 40), then replace the `rx` boolean in `wodResults` with `rxLevel` and add `public`:

```typescript
// Add after line 40 (after WodScoreType definition)
export type RxLevel = "SCALED" | "RX" | "RX_PLUS";
```

Replace the `wodResults` table definition (lines 121-135) with:

```typescript
export const wodResults = pgTable("wod_results", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  workoutId: integer("workout_id")
    .references(() => workouts.id, { onDelete: "cascade" })
    .notNull(),
  sectionId: integer("section_id")
    .references(() => workoutSections.id, { onDelete: "cascade" })
    .notNull(),
  scoreType: text("score_type").notNull().$type<WodScoreType>(),
  scoreValue: text("score_value").notNull(),
  rxLevel: text("rx_level").notNull().default("SCALED").$type<RxLevel>(),
  public: boolean("public").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

- [ ] **Step 2: Generate and push the migration**

Run:
```bash
npx drizzle-kit generate
```

Then apply. Since this is a breaking change (dropping `rx`, adding `rxLevel`), we need a manual SQL migration. Run this against the database:

```bash
npx tsx -e "
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL!);
async function migrate() {
  await sql('ALTER TABLE wod_results ADD COLUMN IF NOT EXISTS rx_level text NOT NULL DEFAULT \'SCALED\'');
  await sql('UPDATE wod_results SET rx_level = CASE WHEN rx = true THEN \'RX\' ELSE \'SCALED\' END');
  await sql('ALTER TABLE wod_results ADD COLUMN IF NOT EXISTS public boolean NOT NULL DEFAULT true');
  await sql('ALTER TABLE wod_results DROP COLUMN IF EXISTS rx');
  console.log('Migration complete');
}
migrate().catch(console.error);
"
```

- [ ] **Step 3: Push the updated schema to sync Drizzle**

Run:
```bash
npx drizzle-kit push
```

Expected: Schema synced with no errors.

- [ ] **Step 4: Verify the migration**

Run:
```bash
npx tsx -e "
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL!);
sql('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'wod_results\' ORDER BY ordinal_position').then(console.log);
"
```

Expected: Should show `rx_level` (text) and `public` (boolean) columns. No `rx` column.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: migrate wodResults schema — rxLevel enum + public field

Replace boolean rx with rxLevel (SCALED/RX/RX_PLUS) and add per-score
public visibility toggle for leaderboard system.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Score Parsing and Comparison Utility

**Files:**
- Create: `src/lib/wod-scoring.ts`

- [ ] **Step 1: Create the wod-scoring utility**

Create `src/lib/wod-scoring.ts`:

```typescript
import type { WodScoreType } from "@/db/schema";
import { TIERS, assessWodScore, findBenchmarkWod, getAllBenchmarkWods } from "./benchmark-wods";
import type { Sex } from "./strength-standards";

export function parseTimeToSeconds(value: string): number {
  const parts = value.split(":");
  if (parts.length !== 2) return 0;
  const m = parseInt(parts[0]) || 0;
  const s = parseInt(parts[1]) || 0;
  return m * 60 + s;
}

export function parseRoundsReps(value: string): { rounds: number; reps: number; total: number } {
  if (value.includes("+")) {
    const [r, rep] = value.split("+");
    const rounds = parseInt(r) || 0;
    const reps = parseInt(rep) || 0;
    return { rounds, reps, total: rounds * 1000 + reps };
  }
  const rounds = parseInt(value) || 0;
  return { rounds, reps: 0, total: rounds * 1000 };
}

export function compareWodScores(a: string, b: string, scoreType: WodScoreType): number {
  if (scoreType === "TIME" || scoreType === "INTERVAL") {
    return parseTimeToSeconds(a) - parseTimeToSeconds(b);
  }
  if (scoreType === "ROUNDS_REPS") {
    return parseRoundsReps(b).total - parseRoundsReps(a).total;
  }
  return parseFloat(b) - parseFloat(a);
}

export function isBetterScore(candidate: string, existing: string, scoreType: WodScoreType): boolean {
  return compareWodScores(candidate, existing, scoreType) < 0;
}

const TIER_POINTS: Record<string, number> = {
  DRAGON: 100,
  BEAST: 70,
  WARRIOR: 40,
  HUNTER: 20,
  ROOKIE: 5,
};

const TIER_THRESHOLDS = [
  { name: "DRAGON", min: 850 },
  { name: "BEAST", min: 600 },
  { name: "WARRIOR", min: 350 },
  { name: "HUNTER", min: 150 },
  { name: "ROOKIE", min: 0 },
];

export function computeCompositeScore(
  tierResults: { wodName: string; tierName: string }[]
): { score: number; overallTier: string; pointsToNextTier: number; nextTier: string | null } {
  if (tierResults.length === 0) {
    return { score: 0, overallTier: "ROOKIE", pointsToNextTier: 150, nextTier: "HUNTER" };
  }

  const totalPoints = tierResults.reduce((sum, r) => sum + (TIER_POINTS[r.tierName] ?? 0), 0);
  const maxPossible = tierResults.length * 100;
  const score = Math.round((totalPoints / maxPossible) * 1000);

  let overallTier = "ROOKIE";
  for (const t of TIER_THRESHOLDS) {
    if (score >= t.min) {
      overallTier = t.name;
      break;
    }
  }

  const currentIdx = TIER_THRESHOLDS.findIndex((t) => t.name === overallTier);
  const nextTier = currentIdx > 0 ? TIER_THRESHOLDS[currentIdx - 1].name : null;
  const pointsToNextTier = nextTier ? TIER_THRESHOLDS[currentIdx - 1].min - score : 0;

  return { score, overallTier, pointsToNextTier, nextTier };
}

export function distanceToNextTier(
  scoreValue: string,
  scoreType: WodScoreType,
  wodName: string,
  sex: Sex,
  currentTierIndex: number
): string | null {
  if (currentTierIndex <= 0) return null;

  const benchmark = findBenchmarkWod(wodName);
  if (!benchmark) return null;

  const brackets = benchmark[sex];
  const tierNames = ["dragon", "beast", "warrior", "hunter"] as const;
  const nextTierKey = tierNames[currentTierIndex - 1];
  if (!nextTierKey) return null;

  const target = brackets[nextTierKey];

  if (scoreType === "TIME" || scoreType === "INTERVAL") {
    const current = parseTimeToSeconds(scoreValue);
    const diff = current - target;
    if (diff <= 0) return null;
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return m > 0 ? `${m}:${String(s).padStart(2, "0")} faster` : `${s}s faster`;
  }

  if (scoreType === "ROUNDS_REPS") {
    const current = parseRoundsReps(scoreValue).total;
    const diff = target - current;
    if (diff <= 0) return null;
    const rounds = Math.floor(diff / 1000);
    const reps = diff % 1000;
    if (rounds > 0 && reps > 0) return `${rounds} rounds + ${reps} reps more`;
    if (rounds > 0) return `${rounds} more rounds`;
    return `${reps} more reps`;
  }

  return null;
}

export { TIER_POINTS, TIER_THRESHOLDS };
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npx tsc --noEmit src/lib/wod-scoring.ts 2>&1 | head -20
```

Expected: No errors (or only unrelated errors from other files).

- [ ] **Step 3: Commit**

```bash
git add src/lib/wod-scoring.ts
git commit -m "feat: add WOD score parsing, comparison, and composite scoring

Utilities for semantic score comparison (TIME lower=better,
ROUNDS_REPS higher=better), composite tier scoring (0-1000),
and distance-to-next-tier calculations.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Update Server Actions

**Files:**
- Modify: `src/app/actions.ts:1099-1176`

- [ ] **Step 1: Update logWodResult to use rxLevel and public**

Replace the `logWodResult` function (lines 1099-1122) with:

```typescript
export async function logWodResult(data: {
  workoutId: number;
  sectionId: number;
  scoreType: WodScoreType;
  scoreValue: string;
  rxLevel: RxLevel;
  public?: boolean;
  notes?: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  await db.insert(wodResults).values({
    userId,
    workoutId: data.workoutId,
    sectionId: data.sectionId,
    scoreType: data.scoreType,
    scoreValue: data.scoreValue,
    rxLevel: data.rxLevel,
    public: data.public ?? true,
    notes: data.notes ?? null,
  });

  revalidatePath("/schedule");
  revalidatePath("/progress");
  revalidatePath("/leaderboard");
}
```

Add the `RxLevel` import at the top of the file alongside the existing schema imports:

```typescript
import { ..., type RxLevel } from "@/db/schema";
```

- [ ] **Step 2: Update getWodResult to return rxLevel**

Replace `getWodResult` (lines 1124-1136) with:

```typescript
export async function getWodResult(sectionId: number) {
  const { userId } = await auth();
  if (!userId) return null;

  const [result] = await db
    .select()
    .from(wodResults)
    .where(and(eq(wodResults.userId, userId), eq(wodResults.sectionId, sectionId)))
    .orderBy(desc(wodResults.createdAt))
    .limit(1);

  return result ?? null;
}
```

(Same query, but now returns `rxLevel` and `public` instead of `rx` since the schema changed.)

- [ ] **Step 3: Rewrite getWodLeaderboard with semantic sorting and rxLevel filter**

Replace `getWodLeaderboard` (lines 1138-1176) with:

```typescript
export async function getWodLeaderboard(
  sectionId: number,
  rxLevel: RxLevel
): Promise<{
  entries: { userId: string; displayName: string; scoreValue: string; rxLevel: RxLevel; position: number }[];
  currentUserId: string | null;
  scoreType: WodScoreType | null;
}> {
  const { userId } = await auth();

  const section = await db
    .select({ wodScoreType: workoutSections.wodScoreType })
    .from(workoutSections)
    .where(eq(workoutSections.id, sectionId))
    .limit(1);

  const scoreType = (section[0]?.wodScoreType as WodScoreType) ?? null;

  const optedInUsers = await db
    .select({ userId: userProfiles.userId })
    .from(userProfiles)
    .where(eq(userProfiles.leaderboardOptIn, true));

  const optedInIds = new Set(optedInUsers.map((u) => u.userId));

  const results = await db
    .select()
    .from(wodResults)
    .where(
      and(
        eq(wodResults.sectionId, sectionId),
        eq(wodResults.rxLevel, rxLevel),
        eq(wodResults.public, true)
      )
    );

  const filtered = results.filter((r) => optedInIds.has(r.userId));

  const bestByUser = new Map<string, typeof filtered[0]>();
  for (const r of filtered) {
    const existing = bestByUser.get(r.userId);
    if (!existing || (scoreType && isBetterScore(r.scoreValue, existing.scoreValue, scoreType))) {
      bestByUser.set(r.userId, r);
    }
  }

  const sorted = Array.from(bestByUser.values());
  if (scoreType) {
    sorted.sort((a, b) => compareWodScores(a.scoreValue, b.scoreValue, scoreType));
  }

  const userIds = sorted.map((r) => r.userId);
  const profiles = userIds.length > 0
    ? await db
        .select({ userId: userProfiles.userId, displayName: userProfiles.displayName })
        .from(userProfiles)
        .where(inArray(userProfiles.userId, userIds))
    : [];

  const nameMap = new Map(profiles.map((p) => [p.userId, p.displayName || "ANONYMOUS"]));

  const entries = sorted.map((r, i) => ({
    userId: r.userId,
    displayName: nameMap.get(r.userId) || "ANONYMOUS",
    scoreValue: r.scoreValue,
    rxLevel: r.rxLevel as RxLevel,
    position: i + 1,
  }));

  return { entries, currentUserId: userId, scoreType };
}
```

Add the imports at the top of the file:

```typescript
import { compareWodScores, isBetterScore } from "@/lib/wod-scoring";
```

- [ ] **Step 4: Add getCrossfitLeaderboardData server action**

Add this new action after `getWodLeaderboard`:

```typescript
export async function getCrossfitLeaderboardData(rxLevel: RxLevel) {
  const { userId } = await auth();

  const optedInUsers = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.leaderboardOptIn, true));

  const optedInIds = new Set(optedInUsers.map((u) => u.userId));

  const allPublicResults = await db
    .select()
    .from(wodResults)
    .where(and(eq(wodResults.rxLevel, rxLevel), eq(wodResults.public, true)));

  const filtered = allPublicResults.filter((r) => optedInIds.has(r.userId));

  const benchmarkWods = getAllBenchmarkWods();
  const benchmarkNames = new Set(benchmarkWods.map((w) => w.name.toLowerCase()));

  const allSectionIds = [...new Set(filtered.map((r) => r.sectionId))];
  const sections = allSectionIds.length > 0
    ? await db
        .select({ id: workoutSections.id, wodName: workoutSections.wodName, wodScoreType: workoutSections.wodScoreType })
        .from(workoutSections)
        .where(inArray(workoutSections.id, allSectionIds))
    : [];

  const sectionMap = new Map(sections.map((s) => [s.id, s]));

  type UserWodBest = { wodName: string; scoreValue: string; scoreType: string };
  const userBests = new Map<string, Map<string, UserWodBest>>();

  for (const r of filtered) {
    const section = sectionMap.get(r.sectionId);
    if (!section?.wodName) continue;
    const wodLower = section.wodName.toLowerCase();
    if (!benchmarkNames.has(wodLower)) continue;

    if (!userBests.has(r.userId)) userBests.set(r.userId, new Map());
    const userMap = userBests.get(r.userId)!;
    const existing = userMap.get(wodLower);
    const st = section.wodScoreType as WodScoreType;

    if (!existing || isBetterScore(r.scoreValue, existing.scoreValue, st)) {
      userMap.set(wodLower, { wodName: section.wodName, scoreValue: r.scoreValue, scoreType: st });
    }
  }

  const nameMap = new Map(optedInUsers.map((u) => [u.userId, u.displayName || "ANONYMOUS"]));

  const rankings = Array.from(userBests.entries())
    .map(([uid, wods]) => {
      const sex = optedInUsers.find((u) => u.userId === uid)?.sex as "male" | "female" | null;
      const tierResults: { wodName: string; tierName: string }[] = [];
      const tierCounts: Record<string, number> = {};

      for (const [, best] of wods) {
        if (!sex) continue;
        const st = best.scoreType === "INTERVAL" ? "TIME" : best.scoreType;
        if (st !== "TIME" && st !== "ROUNDS_REPS") continue;
        const result = assessWodScore(best.wodName, best.scoreValue, st as "TIME" | "ROUNDS_REPS", sex);
        if (result) {
          tierResults.push({ wodName: best.wodName, tierName: result.tier.name });
          tierCounts[result.tier.name] = (tierCounts[result.tier.name] || 0) + 1;
        }
      }

      const { score, overallTier, pointsToNextTier, nextTier } = computeCompositeScore(tierResults);

      return {
        userId: uid,
        displayName: nameMap.get(uid) || "ANONYMOUS",
        compositeScore: score,
        overallTier,
        tierCounts,
        wodsAttempted: wods.size,
        pointsToNextTier,
        nextTier,
      };
    })
    .filter((r) => r.wodsAttempted >= 3)
    .sort((a, b) => b.compositeScore - a.compositeScore);

  let currentUser = null;
  if (userId) {
    const myWods = userBests.get(userId);
    if (myWods) {
      const sex = optedInUsers.find((u) => u.userId === userId)?.sex as "male" | "female" | null;
      const tierResults: { wodName: string; tierName: string }[] = [];
      const tierCounts: Record<string, number> = {};

      for (const [, best] of myWods) {
        if (!sex) continue;
        const st = best.scoreType === "INTERVAL" ? "TIME" : best.scoreType;
        if (st !== "TIME" && st !== "ROUNDS_REPS") continue;
        const result = assessWodScore(best.wodName, best.scoreValue, st as "TIME" | "ROUNDS_REPS", sex);
        if (result) {
          tierResults.push({ wodName: best.wodName, tierName: result.tier.name });
          tierCounts[result.tier.name] = (tierCounts[result.tier.name] || 0) + 1;
        }
      }

      const { score, overallTier, pointsToNextTier, nextTier } = computeCompositeScore(tierResults);
      currentUser = { userId, compositeScore: score, overallTier, tierCounts, pointsToNextTier, nextTier };
    }
  }

  const userBenchmarks = userId ? userBests.get(userId) : null;
  const benchmarkWodCards = benchmarkWods.map((w) => {
    const userBest = userBenchmarks?.get(w.name.toLowerCase());
    let userBestTier: string | null = null;
    if (userBest) {
      const sex = optedInUsers.find((u) => u.userId === userId)?.sex as "male" | "female" | null;
      if (sex) {
        const st = userBest.scoreType === "INTERVAL" ? "TIME" : userBest.scoreType;
        if (st === "TIME" || st === "ROUNDS_REPS") {
          const result = assessWodScore(w.name, userBest.scoreValue, st as "TIME" | "ROUNDS_REPS", sex);
          userBestTier = result?.tier.name ?? null;
        }
      }
    }
    return {
      name: w.name,
      description: w.description,
      scoreType: w.scoreType,
      userBestTier,
    };
  });

  return { rankings, currentUser, benchmarkWods: benchmarkWodCards, currentUserId: userId };
}
```

Add the imports at the top:

```typescript
import { computeCompositeScore } from "@/lib/wod-scoring";
import { assessWodScore, getAllBenchmarkWods } from "@/lib/benchmark-wods";
```

(Only add if not already imported — `assessWodScore` may already be imported elsewhere.)

- [ ] **Step 5: Add getWodDrilldown server action**

Add this action after `getCrossfitLeaderboardData`:

```typescript
export async function getWodDrilldown(wodName: string, rxLevel: RxLevel) {
  const { userId } = await auth();

  const benchmark = findBenchmarkWod(wodName);
  if (!benchmark) return null;

  const sections = await db
    .select({ id: workoutSections.id, wodScoreType: workoutSections.wodScoreType })
    .from(workoutSections)
    .where(eq(workoutSections.wodName, wodName));

  const sectionIds = sections.map((s) => s.id);
  if (sectionIds.length === 0) return { wod: benchmark, userBest: null, entries: [], currentUserId: userId };

  const scoreType = (sections[0].wodScoreType as WodScoreType) ?? benchmark.scoreType;

  const optedInUsers = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.leaderboardOptIn, true));

  const optedInIds = new Set(optedInUsers.map((u) => u.userId));

  const results = await db
    .select()
    .from(wodResults)
    .where(
      and(
        inArray(wodResults.sectionId, sectionIds),
        eq(wodResults.rxLevel, rxLevel),
        eq(wodResults.public, true)
      )
    );

  const filtered = results.filter((r) => optedInIds.has(r.userId));

  const bestByUser = new Map<string, typeof filtered[0]>();
  for (const r of filtered) {
    const existing = bestByUser.get(r.userId);
    if (!existing || isBetterScore(r.scoreValue, existing.scoreValue, scoreType)) {
      bestByUser.set(r.userId, r);
    }
  }

  const sorted = Array.from(bestByUser.values());
  sorted.sort((a, b) => compareWodScores(a.scoreValue, b.scoreValue, scoreType));

  const nameMap = new Map(optedInUsers.map((u) => [u.userId, u.displayName || "ANONYMOUS"]));

  const entries = sorted.map((r, i) => {
    const sex = optedInUsers.find((u) => u.userId === r.userId)?.sex as "male" | "female" | null;
    let tier: string | null = null;
    if (sex) {
      const st = scoreType === "INTERVAL" ? "TIME" : scoreType;
      if (st === "TIME" || st === "ROUNDS_REPS") {
        const result = assessWodScore(wodName, r.scoreValue, st as "TIME" | "ROUNDS_REPS", sex);
        tier = result?.tier.name ?? null;
      }
    }
    return {
      userId: r.userId,
      displayName: nameMap.get(r.userId) || "ANONYMOUS",
      scoreValue: r.scoreValue,
      tier,
      position: i + 1,
    };
  });

  let userBest = null;
  if (userId) {
    const allMyResults = await db
      .select()
      .from(wodResults)
      .where(
        and(
          eq(wodResults.userId, userId),
          inArray(wodResults.sectionId, sectionIds),
          eq(wodResults.rxLevel, rxLevel)
        )
      );

    if (allMyResults.length > 0) {
      const best = allMyResults.reduce((a, b) =>
        isBetterScore(a.scoreValue, b.scoreValue, scoreType) ? a : b
      );

      const profile = optedInUsers.find((u) => u.userId === userId);
      const sex = (profile?.sex as "male" | "female" | null) ?? null;
      let tier: string | null = null;
      let percentile: string | null = null;
      let distToNext: string | null = null;
      let nextTier: string | null = null;

      if (sex) {
        const st = scoreType === "INTERVAL" ? "TIME" : scoreType;
        if (st === "TIME" || st === "ROUNDS_REPS") {
          const result = assessWodScore(wodName, best.scoreValue, st as "TIME" | "ROUNDS_REPS", sex);
          if (result) {
            tier = result.tier.name;
            percentile = result.percentileLabel;
            distToNext = distanceToNextTier(best.scoreValue, scoreType, wodName, sex, result.tierIndex);
            const tierNames = ["DRAGON", "BEAST", "WARRIOR", "HUNTER", "ROOKIE"];
            nextTier = result.tierIndex > 0 ? tierNames[result.tierIndex - 1] : null;
          }
        }
      }

      userBest = {
        scoreValue: best.scoreValue,
        rxLevel: best.rxLevel,
        tier,
        percentile,
        date: best.createdAt.toISOString().split("T")[0],
        distanceToNextTier: distToNext,
        nextTier,
      };
    }
  }

  return {
    wod: { name: benchmark.name, description: benchmark.description, scoreType: benchmark.scoreType },
    userBest,
    entries,
    currentUserId: userId,
  };
}
```

Add the remaining imports:

```typescript
import { distanceToNextTier } from "@/lib/wod-scoring";
import { findBenchmarkWod } from "@/lib/benchmark-wods";
```

- [ ] **Step 6: Verify the app still compiles**

Run:
```bash
npx next build 2>&1 | tail -20
```

Expected: Build succeeds (there may be type errors in components that still reference `rx` — those get fixed in Task 4).

- [ ] **Step 7: Commit**

```bash
git add src/app/actions.ts
git commit -m "feat: add CrossFit leaderboard server actions

Update logWodResult/getWodResult for rxLevel, fix getWodLeaderboard
semantic sorting, add getCrossfitLeaderboardData and getWodDrilldown.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Shared RxLevel Tabs Component

**Files:**
- Create: `src/components/rx-level-tabs.tsx`

- [ ] **Step 1: Create the RxLevel tabs component**

Create `src/components/rx-level-tabs.tsx`:

```typescript
"use client";

import type { RxLevel } from "@/db/schema";

interface RxLevelTabsProps {
  value: RxLevel;
  onChange: (level: RxLevel) => void;
}

const LEVELS: { value: RxLevel; label: string }[] = [
  { value: "SCALED", label: "Scaled" },
  { value: "RX", label: "RX" },
  { value: "RX_PLUS", label: "RX+" },
];

export function RxLevelTabs({ value, onChange }: RxLevelTabsProps) {
  return (
    <div className="flex bg-surface-container p-1">
      {LEVELS.map((level) => (
        <button
          key={level.value}
          onClick={() => onChange(level.value)}
          className={`flex-1 py-1.5 text-center text-[11px] font-bold uppercase tracking-widest transition-colors ${
            value === level.value
              ? "bg-primary text-on-primary"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          {level.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/rx-level-tabs.tsx
git commit -m "feat: add shared RxLevel tabs component (Scaled/RX/RX+)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Update WOD Score Entry Component

**Files:**
- Modify: `src/components/wod-score-entry.tsx`

- [ ] **Step 1: Update the component to use rxLevel, public toggle, and inline leaderboard**

Replace the entire `src/components/wod-score-entry.tsx` with:

```typescript
"use client";

import { useState } from "react";
import { logWodResult } from "@/app/actions";
import type { WodScoreType, RxLevel } from "@/db/schema";
import { assessWodScore, type WodTierResult } from "@/lib/benchmark-wods";
import type { Sex } from "@/lib/strength-standards";
import { toast } from "sonner";
import { RxLevelTabs } from "./rx-level-tabs";
import { InlineWodLeaderboard } from "./inline-wod-leaderboard";

interface WodScoreEntryProps {
  workoutId: number;
  sectionId: number;
  scoreType: WodScoreType;
  timeCap?: number | null;
  rxWeights?: string | null;
  wodName?: string | null;
  userSex?: Sex | null;
  existingScore?: {
    scoreValue: string;
    rxLevel: RxLevel;
  } | null;
}

export function WodScoreEntry({
  workoutId,
  sectionId,
  scoreType,
  timeCap,
  rxWeights,
  wodName,
  userSex,
  existingScore,
}: WodScoreEntryProps) {
  const [logging, setLogging] = useState(false);
  const [logged, setLogged] = useState(!!existingScore);
  const [displayScore, setDisplayScore] = useState(existingScore?.scoreValue || "");
  const [displayRxLevel, setDisplayRxLevel] = useState<RxLevel>(existingScore?.rxLevel || "SCALED");
  const [tierResult, setTierResult] = useState<WodTierResult | null>(() => {
    if (!existingScore || !wodName || !userSex) return null;
    const st = scoreType === "INTERVAL" ? "TIME" : scoreType;
    if (st !== "TIME" && st !== "ROUNDS_REPS") return null;
    return assessWodScore(wodName, existingScore.scoreValue, st, userSex);
  });

  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [rounds, setRounds] = useState("");
  const [reps, setReps] = useState("");
  const [rxLevel, setRxLevel] = useState<RxLevel>("RX");
  const [isPublic, setIsPublic] = useState(true);

  async function handleSubmit() {
    let scoreValue = "";

    if (scoreType === "TIME" || scoreType === "INTERVAL") {
      const m = parseInt(minutes) || 0;
      const s = parseInt(seconds) || 0;
      if (m === 0 && s === 0) { toast.error("Enter a time"); return; }
      scoreValue = `${m}:${String(s).padStart(2, "0")}`;
    } else if (scoreType === "ROUNDS_REPS") {
      const r = parseInt(rounds) || 0;
      const rep = parseInt(reps) || 0;
      if (r === 0 && rep === 0) { toast.error("Enter rounds and reps"); return; }
      scoreValue = rep > 0 ? `${r}+${rep}` : `${r}`;
    } else {
      scoreValue = rounds || "0";
      if (!scoreValue || scoreValue === "0") { toast.error("Enter a value"); return; }
    }

    setLogging(true);
    try {
      await logWodResult({ workoutId, sectionId, scoreType, scoreValue, rxLevel, public: isPublic });
      toast.success("Score logged!");
      setLogged(true);
      setDisplayScore(scoreValue);
      setDisplayRxLevel(rxLevel);

      if (wodName && userSex) {
        const st = scoreType === "INTERVAL" ? "TIME" : scoreType;
        if (st === "TIME" || st === "ROUNDS_REPS") {
          setTierResult(assessWodScore(wodName, scoreValue, st, userSex));
        }
      }
    } catch {
      toast.error("Failed to log score");
    } finally {
      setLogging(false);
    }
  }

  if (logged) {
    return (
      <div className="flex flex-col gap-0">
        <div className="flex items-center justify-between bg-primary/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-lg text-primary">check_circle</span>
            <div>
              <span className="font-headline text-xl font-black text-primary">
                {displayScore}
              </span>
              <span className={`ml-2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                displayRxLevel === "RX_PLUS"
                  ? "bg-yellow-500 text-black"
                  : displayRxLevel === "RX"
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-highest text-on-surface-variant"
              }`}>
                {displayRxLevel === "RX_PLUS" ? "RX+" : displayRxLevel}
              </span>
              {!isPublic && (
                <span className="ml-2 text-[9px] text-outline">
                  <span className="material-symbols-outlined text-xs">visibility_off</span>
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => { setLogged(false); setDisplayScore(""); setDisplayRxLevel("SCALED"); setTierResult(null); }}
            className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
          >
            LOG AGAIN
          </button>
        </div>
        {tierResult && (
          <div
            className="flex items-center gap-4 px-5 py-4"
            style={{ backgroundColor: tierResult.tier.color + "15" }}
          >
            <span
              className="material-symbols-outlined text-3xl"
              style={{ color: tierResult.tier.color, fontVariationSettings: "'FILL' 1" }}
            >
              {tierResult.tier.icon}
            </span>
            <div>
              <p className="font-headline text-lg font-black uppercase tracking-tight" style={{ color: tierResult.tier.color }}>
                {tierResult.tier.name}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                {tierResult.percentileLabel} · {tierResult.benchmarkWod.name.toUpperCase()} BENCHMARK
              </p>
            </div>
          </div>
        )}
        <InlineWodLeaderboard
          sectionId={sectionId}
          defaultRxLevel={displayRxLevel}
          wodName={wodName}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 bg-surface-container-high px-5 py-4">
      <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
        LOG YOUR SCORE
      </span>

      {(scoreType === "TIME" || scoreType === "INTERVAL") && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="MM"
            min="0"
            className="w-16 bg-surface-container px-3 py-2 text-center font-headline text-lg font-bold text-on-surface outline-none placeholder:text-outline"
          />
          <span className="font-headline text-lg font-bold text-outline">:</span>
          <input
            type="number"
            value={seconds}
            onChange={(e) => setSeconds(e.target.value)}
            placeholder="SS"
            min="0"
            max="59"
            className="w-16 bg-surface-container px-3 py-2 text-center font-headline text-lg font-bold text-on-surface outline-none placeholder:text-outline"
          />
          {timeCap && (
            <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-outline">
              CAP {Math.floor(timeCap / 60)}:{String(timeCap % 60).padStart(2, "0")}
            </span>
          )}
        </div>
      )}

      {scoreType === "ROUNDS_REPS" && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={rounds}
            onChange={(e) => setRounds(e.target.value)}
            placeholder="RNDS"
            min="0"
            className="w-16 bg-surface-container px-3 py-2 text-center font-headline text-lg font-bold text-on-surface outline-none placeholder:text-outline"
          />
          <span className="font-headline text-lg font-bold text-outline">+</span>
          <input
            type="number"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="REPS"
            min="0"
            className="w-16 bg-surface-container px-3 py-2 text-center font-headline text-lg font-bold text-on-surface outline-none placeholder:text-outline"
          />
        </div>
      )}

      {(scoreType === "LOAD" || scoreType === "CALS" || scoreType === "DISTANCE") && (
        <input
          type="text"
          value={rounds}
          onChange={(e) => setRounds(e.target.value)}
          placeholder={scoreType === "LOAD" ? "kg" : scoreType === "CALS" ? "cals" : "m"}
          className="w-32 bg-surface-container px-3 py-2 text-center font-headline text-lg font-bold text-on-surface outline-none placeholder:text-outline"
        />
      )}

      <RxLevelTabs value={rxLevel} onChange={setRxLevel} />

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsPublic(!isPublic)}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant"
        >
          <span className="material-symbols-outlined text-sm">
            {isPublic ? "visibility" : "visibility_off"}
          </span>
          {isPublic ? "Public" : "Private"}
        </button>

        <button
          onClick={handleSubmit}
          disabled={logging}
          className="squishy bg-primary px-6 py-2.5 font-headline text-[11px] font-bold uppercase tracking-widest text-on-primary disabled:opacity-50"
        >
          {logging ? "..." : "LOG SCORE"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update the workout detail page to pass rxLevel instead of rx**

In `src/app/(app)/workout/[date]/page.tsx`, find the `WodScoreEntry` usage (around line 300-309). Change:

```typescript
existingScore={wodResult ? { scoreValue: wodResult.scoreValue, rx: wodResult.rx } : null}
```

to:

```typescript
existingScore={wodResult ? { scoreValue: wodResult.scoreValue, rxLevel: wodResult.rxLevel as RxLevel } : null}
```

Add the `RxLevel` import at the top:

```typescript
import type { RxLevel } from "@/db/schema";
```

- [ ] **Step 3: Verify the app compiles**

Run:
```bash
npx next build 2>&1 | tail -20
```

Expected: May fail because `InlineWodLeaderboard` doesn't exist yet — that's OK, we build it next.

- [ ] **Step 4: Commit**

```bash
git add src/components/wod-score-entry.tsx src/app/\(app\)/workout/\[date\]/page.tsx
git commit -m "feat: update WOD score entry with Scaled/RX/RX+ tabs and public toggle

Replace boolean rx checkbox with three-way RxLevel segmented control,
add per-score public/private toggle, prepare for inline leaderboard.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Inline WOD Leaderboard Component (Surface 1)

**Files:**
- Create: `src/components/inline-wod-leaderboard.tsx`

- [ ] **Step 1: Create the inline leaderboard component**

Create `src/components/inline-wod-leaderboard.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { getWodLeaderboard } from "@/app/actions";
import type { RxLevel } from "@/db/schema";
import { RxLevelTabs } from "./rx-level-tabs";
import Link from "next/link";

interface InlineWodLeaderboardProps {
  sectionId: number;
  defaultRxLevel: RxLevel;
  wodName?: string | null;
}

type LeaderboardEntry = {
  userId: string;
  displayName: string;
  scoreValue: string;
  rxLevel: RxLevel;
  position: number;
};

export function InlineWodLeaderboard({ sectionId, defaultRxLevel, wodName }: InlineWodLeaderboardProps) {
  const [rxLevel, setRxLevel] = useState<RxLevel>(defaultRxLevel);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getWodLeaderboard(sectionId, rxLevel).then((data) => {
      setEntries(data.entries);
      setCurrentUserId(data.currentUserId);
      setLoading(false);
    });
  }, [sectionId, rxLevel]);

  const userEntry = entries.find((e) => e.userId === currentUserId);
  const top5 = entries.slice(0, 5);
  const showUserSeparately = userEntry && userEntry.position > 5;

  return (
    <div className="bg-surface-container px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          LEADERBOARD
        </span>
      </div>

      <RxLevelTabs value={rxLevel} onChange={setRxLevel} />

      {loading ? (
        <div className="py-6 text-center text-xs text-outline">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Be the first!
          </p>
          <p className="mt-1 text-[10px] text-outline">
            No {rxLevel === "RX_PLUS" ? "RX+" : rxLevel} scores yet
          </p>
        </div>
      ) : (
        <div className="mt-3 flex flex-col">
          {top5.map((entry) => {
            const isMe = entry.userId === currentUserId;
            return (
              <div
                key={entry.userId}
                className={`flex items-center py-2 ${isMe ? "bg-primary/5 -mx-2 px-2" : ""}`}
              >
                <span className={`w-6 text-sm font-bold ${
                  entry.position === 1 ? "text-yellow-400" :
                  entry.position === 2 ? "text-gray-300" :
                  entry.position === 3 ? "text-amber-600" : "text-outline"
                }`}>
                  {entry.position}
                </span>
                <span className={`flex-1 text-sm font-bold uppercase tracking-tight ${isMe ? "text-primary" : "text-on-surface"}`}>
                  {isMe ? "You" : entry.displayName}
                </span>
                <span className={`text-sm font-bold tabular-nums ${isMe ? "text-primary" : "text-on-surface-variant"}`}>
                  {entry.scoreValue}
                </span>
              </div>
            );
          })}

          {showUserSeparately && (
            <>
              <div className="py-1 text-center text-xs text-outline">···</div>
              <div className="flex items-center bg-primary/5 -mx-2 px-2 py-2">
                <span className="w-6 text-sm font-bold text-outline">{userEntry.position}</span>
                <span className="flex-1 text-sm font-bold uppercase tracking-tight text-primary">You</span>
                <span className="text-sm font-bold tabular-nums text-primary">{userEntry.scoreValue}</span>
              </div>
            </>
          )}
        </div>
      )}

      {wodName && (
        <Link
          href={`/leaderboard/wod/${encodeURIComponent(wodName)}`}
          className="mt-3 block text-center text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
        >
          VIEW FULL LEADERBOARD →
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npx next build 2>&1 | tail -20
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/inline-wod-leaderboard.tsx
git commit -m "feat: add inline WOD leaderboard component (Surface 1)

Shows top 5 + your position after logging a score, with Scaled/RX/RX+
tabs and link to full leaderboard drill-down.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Tier Ladder Component

**Files:**
- Create: `src/components/tier-ladder.tsx`

- [ ] **Step 1: Create the tier ladder component**

Create `src/components/tier-ladder.tsx`:

```typescript
import { TIERS } from "@/lib/benchmark-wods";

interface TierLadderProps {
  compositeScore: number;
  overallTier: string;
  pointsToNextTier: number;
  nextTier: string | null;
}

const TIER_THRESHOLDS = [
  { name: "DRAGON", min: 850, label: "Top 2%" },
  { name: "BEAST", min: 600, label: "Top 16%" },
  { name: "WARRIOR", min: 350, label: "Top 50%" },
  { name: "HUNTER", min: 150, label: "Top 84%" },
  { name: "ROOKIE", min: 0, label: "Getting started" },
];

export function TierLadder({ compositeScore, overallTier, pointsToNextTier, nextTier }: TierLadderProps) {
  const currentTierIdx = TIER_THRESHOLDS.findIndex((t) => t.name === overallTier);
  const currentTierColor = TIERS[currentTierIdx]?.color ?? "#777";

  return (
    <div className="bg-surface-container px-5 py-4">
      <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
        YOUR TIER
      </span>

      <div className="relative mt-4 flex flex-col gap-0 pl-10">
        {/* Vertical line */}
        <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gradient-to-b from-[#ff4444] via-[#cafd00] to-[#777575]" />

        {TIER_THRESHOLDS.map((tier, idx) => {
          const tierData = TIERS[idx];
          const isCurrentTier = tier.name === overallTier;

          return (
            <div key={tier.name} className="relative flex items-center gap-3 py-2.5">
              {/* Dot */}
              <div
                className="absolute left-[-26px] z-10 h-3 w-3 rounded-full border-2 border-surface"
                style={{ backgroundColor: tierData.color }}
              />

              {isCurrentTier ? (
                <>
                  {/* YOU marker */}
                  <div
                    className="absolute left-[-30px] z-20 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface"
                    style={{ backgroundColor: "#22c55e" }}
                  >
                    <span className="text-[6px] font-black text-black">YOU</span>
                  </div>
                  <div className="flex-1 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-headline text-lg font-black text-primary">
                        {compositeScore} pts
                      </span>
                      <span
                        className="text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: tierData.color }}
                      >
                        {tier.name}
                      </span>
                    </div>
                    {nextTier && pointsToNextTier > 0 && (
                      <p className="mt-1 text-[10px] text-primary/70">
                        {pointsToNextTier} pts to {nextTier}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-between">
                  <span
                    className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: tierData.color }}
                  >
                    {tierData.icon === "local_fire_department" ? "🐉" :
                     tierData.icon === "pets" ? "🦁" :
                     tierData.icon === "shield" ? "⚔️" :
                     tierData.icon === "target" ? "🏹" : ""}{" "}
                    {tier.name}
                  </span>
                  <span className="text-[10px] text-outline">{tier.min}+ pts</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tier-ladder.tsx
git commit -m "feat: add tier ladder visualisation component

Vertical progression showing all 5 tiers with user's position
and distance to next tier.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: CrossFit Leaderboard Tab (Surface 2)

**Files:**
- Create: `src/components/crossfit-leaderboard.tsx`

- [ ] **Step 1: Create the CrossFit leaderboard component**

Create `src/components/crossfit-leaderboard.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { getCrossfitLeaderboardData } from "@/app/actions";
import type { RxLevel } from "@/db/schema";
import { TIERS } from "@/lib/benchmark-wods";
import { RxLevelTabs } from "./rx-level-tabs";
import { TierLadder } from "./tier-ladder";
import Link from "next/link";

type Rankings = Awaited<ReturnType<typeof getCrossfitLeaderboardData>>["rankings"];
type CurrentUser = Awaited<ReturnType<typeof getCrossfitLeaderboardData>>["currentUser"];
type BenchmarkWod = Awaited<ReturnType<typeof getCrossfitLeaderboardData>>["benchmarkWods"][0];

const TIER_COLORS: Record<string, string> = {
  DRAGON: "#ff4444",
  BEAST: "#cafd00",
  WARRIOR: "#f3ffca",
  HUNTER: "#adaaaa",
  ROOKIE: "#777575",
};

export function CrossfitLeaderboard() {
  const [rxLevel, setRxLevel] = useState<RxLevel>("RX");
  const [rankings, setRankings] = useState<Rankings>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const [benchmarkWods, setBenchmarkWods] = useState<BenchmarkWod[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCrossfitLeaderboardData(rxLevel).then((data) => {
      setRankings(data.rankings);
      setCurrentUser(data.currentUser);
      setBenchmarkWods(data.benchmarkWods);
      setCurrentUserId(data.currentUserId);
      setLoading(false);
    });
  }, [rxLevel]);

  if (loading) {
    return <div className="py-12 text-center text-xs text-outline">Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <RxLevelTabs value={rxLevel} onChange={setRxLevel} />

      {/* Tier Ladder (personal) */}
      {currentUser && (
        <TierLadder
          compositeScore={currentUser.compositeScore}
          overallTier={currentUser.overallTier}
          pointsToNextTier={currentUser.pointsToNextTier}
          nextTier={currentUser.nextTier}
        />
      )}

      {/* Rankings */}
      <section>
        <span className="mb-3 block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          TIER RANKINGS
        </span>

        {rankings.length === 0 ? (
          <div className="bg-surface-container p-8 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              NO RANKINGS YET
            </p>
            <p className="mt-1 text-[10px] text-outline">
              Need 3+ benchmark WODs to qualify
            </p>
          </div>
        ) : (
          <>
            {/* Podium */}
            {rankings.length >= 3 && (
              <div className="mb-4 flex items-end gap-2">
                {[rankings[1], rankings[0], rankings[2]].map((entry, idx) => {
                  if (!entry) return null;
                  const pos = idx === 0 ? 2 : idx === 1 ? 1 : 3;
                  const isMe = entry.userId === currentUserId;
                  return (
                    <div
                      key={entry.userId}
                      className={`flex flex-1 flex-col items-center bg-surface-container p-3 ${idx === 1 ? "" : "mt-4"}`}
                    >
                      <span className="text-lg">{pos === 1 ? "🥇" : pos === 2 ? "🥈" : "🥉"}</span>
                      <span className={`mt-1 text-xs font-bold uppercase tracking-tight ${isMe ? "text-primary" : ""}`}>
                        {isMe ? "You" : entry.displayName}
                      </span>
                      <div className="mt-2 flex flex-wrap justify-center gap-1">
                        {Object.entries(entry.tierCounts).map(([tier, count]) => (
                          <span
                            key={tier}
                            className="px-1.5 py-0.5 text-[8px] font-bold"
                            style={{ backgroundColor: TIER_COLORS[tier] + "30", color: TIER_COLORS[tier] }}
                          >
                            {count}
                          </span>
                        ))}
                      </div>
                      <span className={`mt-1 text-[10px] font-bold ${isMe ? "text-primary" : "text-outline"}`}>
                        {entry.compositeScore}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full list */}
            <div className="flex flex-col gap-px">
              {rankings.map((entry, i) => {
                const isMe = entry.userId === currentUserId;
                return (
                  <div
                    key={entry.userId}
                    className={`flex items-center p-3 ${
                      isMe ? "bg-primary/5" : "bg-surface-container"
                    }`}
                  >
                    <span className={`w-7 text-sm font-bold ${
                      i === 0 ? "text-yellow-400" :
                      i === 1 ? "text-gray-300" :
                      i === 2 ? "text-amber-600" : "text-outline"
                    }`}>
                      {i + 1}
                    </span>
                    <span className={`flex-1 text-sm font-bold uppercase tracking-tight ${isMe ? "text-primary" : ""}`}>
                      {isMe ? "You" : entry.displayName}
                    </span>
                    <div className="mr-3 flex gap-1">
                      {Object.entries(entry.tierCounts).map(([tier, count]) =>
                        Array.from({ length: count }).map((_, j) => (
                          <span
                            key={`${tier}-${j}`}
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: TIER_COLORS[tier] }}
                          />
                        ))
                      )}
                    </div>
                    <span className={`text-sm font-bold ${isMe ? "text-primary" : "text-on-surface-variant"}`}>
                      {entry.compositeScore}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Browse Benchmark WODs */}
      <section>
        <span className="mb-3 block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          BROWSE BENCHMARK WODS
        </span>
        <div className="grid grid-cols-2 gap-2">
          {benchmarkWods.map((wod) => (
            <Link
              key={wod.name}
              href={`/leaderboard/wod/${encodeURIComponent(wod.name)}`}
              className="bg-surface-container p-3 transition-colors hover:bg-surface-container-high"
            >
              <p className="text-sm font-bold uppercase tracking-tight">{wod.name}</p>
              <p className="mt-0.5 text-[10px] text-outline">{wod.description}</p>
              {wod.userBestTier ? (
                <span
                  className="mt-2 inline-block px-2 py-0.5 text-[9px] font-bold uppercase"
                  style={{ backgroundColor: TIER_COLORS[wod.userBestTier] + "30", color: TIER_COLORS[wod.userBestTier] }}
                >
                  {wod.userBestTier}
                </span>
              ) : (
                <span className="mt-2 inline-block text-[9px] text-outline">Not attempted</span>
              )}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/crossfit-leaderboard.tsx
git commit -m "feat: add CrossFit leaderboard tab component (Surface 2)

Tier ladder, podium, ranked list with coloured dots, and browse
benchmark WODs grid.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Update Leaderboard Page with Tabs

**Files:**
- Modify: `src/app/(app)/leaderboard/page.tsx`

- [ ] **Step 1: Add Barbell/CrossFit tab support**

Replace the entire `src/app/(app)/leaderboard/page.tsx` with a new version that includes tabs. Since the page is a Server Component and we need client-side tab switching, we'll create a wrapper:

Replace the entire file with:

```typescript
import { getLeaderboardData } from "@/app/actions";
import { LeaderboardTabs } from "@/components/leaderboard-tabs";
import Link from "next/link";

export default async function LeaderboardPage() {
  const barbellData = await getLeaderboardData();

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/schedule"
        className="flex items-center gap-1 font-label text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant hover:text-white"
      >
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        SCHEDULE
      </Link>

      <section>
        <p className="mb-2 font-label text-xs uppercase tracking-[0.2em] text-primary">
          FRIENDLY COMPETITION
        </p>
        <h2 className="font-headline text-4xl font-black uppercase tracking-tighter">
          LEADERBOARD
        </h2>
      </section>

      <LeaderboardTabs barbellData={barbellData} />
    </div>
  );
}
```

- [ ] **Step 2: Create the LeaderboardTabs client component**

Create `src/components/leaderboard-tabs.tsx`:

```typescript
"use client";

import { useState } from "react";
import { CrossfitLeaderboard } from "./crossfit-leaderboard";

interface BarbellData {
  lifts: string[];
  entries: Record<string, { userId: string; displayName: string; weight: number; unit: string }[]>;
  currentUserId: string | null;
}

export function LeaderboardTabs({ barbellData }: { barbellData: BarbellData }) {
  const [tab, setTab] = useState<"BARBELL" | "CROSSFIT">("BARBELL");

  return (
    <div className="flex flex-col gap-6">
      {/* Tab Bar */}
      <div className="flex border-b border-surface-container-highest">
        {(["BARBELL", "CROSSFIT"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-center text-[11px] font-bold uppercase tracking-widest transition-colors ${
              tab === t
                ? "border-b-2 border-primary text-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "BARBELL" ? (
        <BarbellLeaderboard data={barbellData} />
      ) : (
        <CrossfitLeaderboard />
      )}
    </div>
  );
}

function BarbellLeaderboard({ data }: { data: BarbellData }) {
  const { lifts, entries, currentUserId } = data;

  if (lifts.length === 0) {
    return (
      <div className="bg-surface-container-high p-12 text-center">
        <span
          className="material-symbols-outlined mb-4 text-5xl text-outline"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          emoji_events
        </span>
        <p className="font-headline text-xl font-bold uppercase tracking-tight text-on-surface-variant">
          NO ONE ON THE BOARD YET
        </p>
        <p className="mt-2 font-label text-xs tracking-widest text-outline">
          OPT IN FROM YOUR PROFILE TO APPEAR HERE
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {lifts.map((lift) => (
        <section key={lift}>
          <h3 className="mb-3 font-headline text-lg font-bold uppercase tracking-tight">
            {lift}
          </h3>
          <div className="flex flex-col gap-px">
            {entries[lift].map((entry, i) => {
              const isMe = entry.userId === currentUserId;
              return (
                <div
                  key={entry.userId}
                  className={`flex items-center justify-between p-4 transition-colors ${
                    isMe
                      ? "bg-primary-container/20"
                      : "bg-surface-container hover:bg-surface-container-high"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`flex h-8 w-8 items-center justify-center font-headline text-sm font-black ${
                        i === 0
                          ? "bg-primary-container text-on-primary-fixed"
                          : i === 1
                            ? "bg-surface-container-highest text-on-surface"
                            : i === 2
                              ? "bg-surface-variant text-on-surface-variant"
                              : "text-outline"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className={`font-headline font-bold uppercase tracking-tight ${isMe ? "text-primary" : ""}`}>
                      {entry.displayName}
                      {isMe && (
                        <span className="ml-2 text-[9px] font-bold tracking-widest text-primary">
                          YOU
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="font-headline text-xl font-bold">
                    {entry.weight}
                    <span className="ml-1 text-sm text-on-surface-variant">{entry.unit}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/leaderboard/page.tsx src/components/leaderboard-tabs.tsx
git commit -m "feat: add Barbell/CrossFit tabs to leaderboard page

Existing 1RM rankings move into Barbell tab, new CrossFit tab
shows tier-based rankings.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 10: Per-WOD Drill-Down Page (Surface 3)

**Files:**
- Create: `src/app/(app)/leaderboard/wod/[wodName]/page.tsx`

- [ ] **Step 1: Create the drill-down page**

Create directory and file `src/app/(app)/leaderboard/wod/[wodName]/page.tsx`:

```typescript
import { getWodDrilldown } from "@/app/actions";
import { WodDrilldownClient } from "@/components/wod-drilldown";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function WodDrilldownPage({
  params,
}: {
  params: Promise<{ wodName: string }>;
}) {
  const { wodName } = await params;
  const decodedName = decodeURIComponent(wodName);

  const initialData = await getWodDrilldown(decodedName, "RX");
  if (!initialData) notFound();

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/leaderboard"
        className="flex items-center gap-1 font-label text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant hover:text-white"
      >
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        LEADERBOARD
      </Link>

      <section>
        <h2 className="font-headline text-4xl font-black uppercase tracking-tighter">
          {decodedName}
        </h2>
        <p className="mt-2 font-label text-xs tracking-widest text-on-surface-variant">
          {initialData.wod.description.toUpperCase()}
        </p>
      </section>

      <WodDrilldownClient wodName={decodedName} initialData={initialData} />
    </div>
  );
}
```

- [ ] **Step 2: Create the WodDrilldownClient component**

Create `src/components/wod-drilldown.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { getWodDrilldown } from "@/app/actions";
import type { RxLevel } from "@/db/schema";
import { TIERS } from "@/lib/benchmark-wods";
import { RxLevelTabs } from "./rx-level-tabs";

type DrilldownData = NonNullable<Awaited<ReturnType<typeof getWodDrilldown>>>;

const TIER_COLORS: Record<string, string> = {
  DRAGON: "#ff4444",
  BEAST: "#cafd00",
  WARRIOR: "#f3ffca",
  HUNTER: "#adaaaa",
  ROOKIE: "#777575",
};

export function WodDrilldownClient({
  wodName,
  initialData,
}: {
  wodName: string;
  initialData: DrilldownData;
}) {
  const [rxLevel, setRxLevel] = useState<RxLevel>("RX");
  const [data, setData] = useState<DrilldownData>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (rxLevel === "RX") return;
    setLoading(true);
    getWodDrilldown(wodName, rxLevel).then((result) => {
      if (result) setData(result);
      setLoading(false);
    });
  }, [rxLevel, wodName]);

  const { userBest, entries, currentUserId } = data;

  return (
    <div className="flex flex-col gap-6">
      {/* Your Best Score */}
      {userBest && (
        <div className="border border-primary/30 bg-surface-container px-5 py-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                YOUR BEST
              </span>
              <p className="mt-1 font-headline text-3xl font-black text-on-surface">
                {userBest.scoreValue}
              </p>
              <p className="mt-1 text-[10px] text-outline">
                {userBest.date} · {userBest.rxLevel === "RX_PLUS" ? "RX+" : userBest.rxLevel}
              </p>
            </div>
            {userBest.tier && (
              <div className="text-right">
                <span
                  className="inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-widest"
                  style={{ backgroundColor: TIER_COLORS[userBest.tier] + "30", color: TIER_COLORS[userBest.tier] }}
                >
                  {userBest.tier}
                </span>
                {userBest.percentile && (
                  <p className="mt-1 text-[10px] text-outline">{userBest.percentile}</p>
                )}
              </div>
            )}
          </div>
          {userBest.distanceToNextTier && userBest.nextTier && (
            <p className="mt-3 border-t border-surface-container-highest pt-3 text-center text-[10px] font-bold text-primary">
              {userBest.distanceToNextTier} to reach {userBest.nextTier}
            </p>
          )}
        </div>
      )}

      <RxLevelTabs value={rxLevel} onChange={setRxLevel} />

      {/* Scores List */}
      <section>
        <span className="mb-3 block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          ALL SCORES
        </span>

        {loading ? (
          <div className="py-8 text-center text-xs text-outline">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="bg-surface-container p-8 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              NO SCORES YET
            </p>
            <p className="mt-1 text-[10px] text-outline">
              Be the first to log {rxLevel === "RX_PLUS" ? "RX+" : rxLevel}!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-px">
            {entries.map((entry) => {
              const isMe = entry.userId === currentUserId;
              return (
                <div
                  key={entry.userId}
                  className={`flex items-center p-3 ${
                    isMe ? "bg-primary/5" : "bg-surface-container"
                  }`}
                >
                  <span className={`w-7 text-sm font-bold ${
                    entry.position === 1 ? "text-yellow-400" :
                    entry.position === 2 ? "text-gray-300" :
                    entry.position === 3 ? "text-amber-600" : "text-outline"
                  }`}>
                    {entry.position}
                  </span>
                  <span className={`flex-1 text-sm font-bold uppercase tracking-tight ${isMe ? "text-primary" : ""}`}>
                    {isMe ? "You" : entry.displayName}
                  </span>
                  {entry.tier && (
                    <span
                      className="mr-3 px-1.5 py-0.5 text-[8px] font-bold uppercase"
                      style={{ backgroundColor: TIER_COLORS[entry.tier] + "30", color: TIER_COLORS[entry.tier] }}
                    >
                      {entry.tier}
                    </span>
                  )}
                  <span className={`text-sm font-bold tabular-nums ${isMe ? "text-primary" : "text-on-surface-variant"}`}>
                    {entry.scoreValue}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Verify the full app builds**

Run:
```bash
npx next build 2>&1 | tail -30
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/leaderboard/wod/ src/components/wod-drilldown.tsx
git commit -m "feat: add per-WOD drill-down leaderboard page (Surface 3)

Shows user's best score with tier badge and distance to next tier,
full ranked list with tier badges, and Scaled/RX/RX+ filtering.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 11: Final Build Verification and Manual Test

- [ ] **Step 1: Full build check**

Run:
```bash
npx next build
```

Expected: Build completes with no errors.

- [ ] **Step 2: Start dev server and verify**

Run:
```bash
npm run dev
```

Verify in browser at http://localhost:3000:

1. Navigate to a CrossFit workout → log a score with Scaled/RX/RX+ → see inline leaderboard appear
2. Navigate to `/leaderboard` → see Barbell and CrossFit tabs
3. Click CrossFit tab → see tier ladder, rankings (or empty state if <3 WODs)
4. Click a benchmark WOD card → see per-WOD drill-down page
5. Check the public/private toggle works on score entry

- [ ] **Step 3: Final commit with all remaining changes**

```bash
git add -A
git status
git commit -m "feat: complete leaderboard system — three surfaces, tier rankings, drill-down

- Schema: rxLevel enum (SCALED/RX/RX_PLUS) replaces boolean rx, added public field
- Surface 1: Inline WOD leaderboard on workout page after logging
- Surface 2: CrossFit leaderboard tab with tier ladder, podium, ranked list, browse WODs
- Surface 3: Per-WOD drill-down with best score, tier badges, distance to next tier
- Shared: RxLevel tabs, semantic score comparison, composite scoring (0-1000)
- Bug fix: WOD leaderboard now sorts semantically instead of by string

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
