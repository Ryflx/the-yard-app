# Exercise Substitution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users swap an accessory/strength exercise for 1–2 alternatives on a given day, persist the substitution per-user-per-date, and log each replacement as an independent lift with its own history.

**Architecture:** New `user_exercise_substitutions` DB table persists swaps. Four new server actions handle CRUD + autocomplete. Two new client components (`ExerciseSubstitutionPanel`, `SubstitutableExerciseRow`) handle the tap-to-swap UI inline in the workout page. `SectionDisplay` receives substitutions as a prop and renders `SubstitutableExerciseRow` for each STRENGTH/ACCESSORY exercise.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM + PostgreSQL, Clerk auth, Tailwind CSS, `sonner` toasts.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/db/schema.ts` | Modify | Add `userExerciseSubstitutions` table |
| `src/app/actions.ts` | Modify | Add 4 new server actions |
| `src/components/exercise-substitution-panel.tsx` | Create | Inline swap panel with free-text + autocomplete chips |
| `src/components/substitutable-exercise-row.tsx` | Create | Client component managing panel state + substituted row display |
| `src/components/section-display.tsx` | Modify | Add `substitutions` prop, render `SubstitutableExerciseRow` for STRENGTH/ACCESSORY |
| `src/app/(app)/workout/[date]/page.tsx` | Modify | Fetch substitutions, extend name lists, pass prop to SectionDisplay |

---

## Task 1: Add DB Table

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Add the table definition**

Open `src/db/schema.ts`. After the last `export const` table (currently `userLiftLogs` ending around line 179), add:

```ts
export const userExerciseSubstitutions = pgTable(
  "user_exercise_substitutions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    workoutId: integer("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    originalName: text("original_name").notNull(),
    replacements: text("replacements").array().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    unique: uniqueIndex("user_exercise_substitutions_unique").on(
      t.userId,
      t.workoutId,
      t.date,
      t.originalName
    ),
  })
);
```

`uniqueIndex` is already imported at the top of the file. `text(...).array()` works with the existing `pgTable` import from `drizzle-orm/pg-core`.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Push schema to DB**

```bash
npm run db:push
```

Expected output contains: `user_exercise_substitutions` table created.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: add user_exercise_substitutions table"
```

---

## Task 2: Server Actions

**Files:**
- Modify: `src/app/actions.ts`

- [ ] **Step 1: Add import for new table**

In `src/app/actions.ts`, find the existing import block (lines 5–14):

```ts
import {
  workouts,
  workoutSections,
  userMaxes,
  userLiftLogs,
  userProfiles,
  userGoals,
  movements,
  wodResults,
} from "@/db/schema";
```

Add `userExerciseSubstitutions` to it:

```ts
import {
  workouts,
  workoutSections,
  userMaxes,
  userLiftLogs,
  userProfiles,
  userGoals,
  movements,
  wodResults,
  userExerciseSubstitutions,
} from "@/db/schema";
```

- [ ] **Step 2: Add `saveExerciseSubstitution`**

Append to the end of `src/app/actions.ts`:

```ts
export async function saveExerciseSubstitution(
  workoutId: number,
  date: string,
  originalName: string,
  replacements: string[]
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  const normalizedOriginal = normalizeLiftName(originalName);
  const normalizedReplacements = replacements.map(normalizeLiftName);
  await db
    .insert(userExerciseSubstitutions)
    .values({
      userId,
      workoutId,
      date,
      originalName: normalizedOriginal,
      replacements: normalizedReplacements,
    })
    .onConflictDoUpdate({
      target: [
        userExerciseSubstitutions.userId,
        userExerciseSubstitutions.workoutId,
        userExerciseSubstitutions.date,
        userExerciseSubstitutions.originalName,
      ],
      set: { replacements: normalizedReplacements },
    });
}
```

- [ ] **Step 3: Add `getExerciseSubstitutionsForDate`**

```ts
export async function getExerciseSubstitutionsForDate(
  date: string,
  workoutId: number
): Promise<Record<string, string[]>> {
  const { userId } = await auth();
  if (!userId) return {};
  const rows = await db
    .select()
    .from(userExerciseSubstitutions)
    .where(
      and(
        eq(userExerciseSubstitutions.userId, userId),
        eq(userExerciseSubstitutions.workoutId, workoutId),
        eq(userExerciseSubstitutions.date, date)
      )
    );
  return Object.fromEntries(rows.map((r) => [r.originalName, r.replacements]));
}
```

- [ ] **Step 4: Add `getSubstitutionCandidates`**

```ts
export async function getSubstitutionCandidates(): Promise<string[]> {
  const { userId } = await auth();
  if (!userId) return [];
  const [userHistory, library] = await Promise.all([
    db
      .select({ name: userLiftLogs.liftName, freq: count(userLiftLogs.id) })
      .from(userLiftLogs)
      .where(eq(userLiftLogs.userId, userId))
      .groupBy(userLiftLogs.liftName)
      .orderBy(desc(count(userLiftLogs.id))),
    db
      .select({ name: movements.name })
      .from(movements)
      .orderBy(asc(movements.name)),
  ]);
  const userNames = userHistory.map((r) => r.name);
  const userNamesSet = new Set(userNames);
  const libraryOnly = library
    .map((r) => r.name)
    .filter((n) => !userNamesSet.has(normalizeLiftName(n)));
  return [...userNames, ...libraryOnly];
}
```

- [ ] **Step 5: Add `deleteExerciseSubstitution`**

```ts
export async function deleteExerciseSubstitution(
  workoutId: number,
  date: string,
  originalName: string
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  const normalized = normalizeLiftName(originalName);
  await db
    .delete(userExerciseSubstitutions)
    .where(
      and(
        eq(userExerciseSubstitutions.userId, userId),
        eq(userExerciseSubstitutions.workoutId, workoutId),
        eq(userExerciseSubstitutions.date, date),
        eq(userExerciseSubstitutions.originalName, normalized)
      )
    );
}
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/actions.ts
git commit -m "feat: add exercise substitution server actions"
```

---

## Task 3: ExerciseSubstitutionPanel Component

**Files:**
- Create: `src/components/exercise-substitution-panel.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useState, useEffect } from "react";
import { getSubstitutionCandidates } from "@/app/actions";

interface ExerciseSubstitutionPanelProps {
  onConfirm: (replacements: string[]) => Promise<void>;
  onCancel: () => void;
}

export function ExerciseSubstitutionPanel({
  onConfirm,
  onCancel,
}: ExerciseSubstitutionPanelProps) {
  const [candidates, setCandidates] = useState<string[]>([]);
  const [input1, setInput1] = useState("");
  const [input2, setInput2] = useState("");
  const [showSecond, setShowSecond] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSubstitutionCandidates().then(setCandidates);
  }, []);

  function filter(q: string): string[] {
    if (q.length === 0) return candidates.slice(0, 5);
    return candidates
      .filter((c) => c.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 8);
  }

  async function handleConfirm() {
    const r1 = input1.trim();
    const r2 = input2.trim();
    if (!r1) return;
    setSaving(true);
    try {
      await onConfirm(showSecond && r2 ? [r1, r2] : [r1]);
    } finally {
      setSaving(false);
    }
  }

  const chips1 = filter(input1);
  const chips2 = filter(input2);

  return (
    <div className="mt-1 flex flex-col gap-2 border border-outline-variant bg-surface-container p-3">
      <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
        Swap exercise for today
      </p>

      <div>
        <input
          type="text"
          autoFocus
          placeholder="Search or type exercise..."
          value={input1}
          onChange={(e) => setInput1(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleConfirm();
            if (e.key === "Escape") onCancel();
          }}
          className="w-full border-0 border-b border-outline-variant bg-transparent py-1 text-sm font-bold text-on-surface placeholder:text-outline focus:border-primary focus:ring-0"
        />
        {chips1.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {chips1.map((c) => (
              <button
                key={c}
                onClick={() => setInput1(c)}
                className="bg-surface-container-highest px-2 py-0.5 text-[9px] font-bold text-on-surface-variant hover:text-on-surface"
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {showSecond && (
        <div>
          <input
            type="text"
            placeholder="Second movement..."
            value={input2}
            onChange={(e) => setInput2(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onCancel();
            }}
            className="w-full border-0 border-b border-outline-variant bg-transparent py-1 text-sm font-bold text-on-surface placeholder:text-outline focus:border-primary focus:ring-0"
          />
          {chips2.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {chips2.map((c) => (
                <button
                  key={c}
                  onClick={() => setInput2(c)}
                  className="bg-surface-container-highest px-2 py-0.5 text-[9px] font-bold text-on-surface-variant hover:text-on-surface"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!showSecond && (
        <button
          onClick={() => setShowSecond(true)}
          className="self-start text-[9px] font-bold uppercase tracking-widest text-outline hover:text-on-surface"
        >
          + add second movement
        </button>
      )}

      <div className="flex items-center justify-end gap-3 pt-1">
        <button
          onClick={onCancel}
          className="text-[9px] font-bold uppercase tracking-widest text-outline hover:text-on-surface"
        >
          CANCEL
        </button>
        <button
          onClick={handleConfirm}
          disabled={!input1.trim() || saving}
          className="squishy bg-primary px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-on-primary disabled:opacity-50"
        >
          {saving ? "..." : "CONFIRM"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/exercise-substitution-panel.tsx
git commit -m "feat: add ExerciseSubstitutionPanel component"
```

---

## Task 4: SubstitutableExerciseRow Component

**Files:**
- Create: `src/components/substitutable-exercise-row.tsx`

This client component wraps a single exercise row. It shows the tappable name (dotted underline), manages the panel open/close state, and renders substituted rows when a swap has been confirmed.

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useState } from "react";
import { saveExerciseSubstitution, deleteExerciseSubstitution } from "@/app/actions";
import { LogExerciseInline } from "@/components/log-exercise-inline";
import { ExerciseSubstitutionPanel } from "@/components/exercise-substitution-panel";
import { toast } from "sonner";

interface PreviousWeight {
  weight: number;
  reps: number | null;
  unit: string;
  prevWeight: number | null;
  prevReps: number | null;
}

interface SubstitutableExerciseRowProps {
  date: string;
  workoutId: number;
  exerciseName: string;
  sectionType: string;
  previousWeights?: Record<string, PreviousWeight>;
  expectedSets?: number;
  defaultReps?: number;
  loggedSetsToday?: Record<string, number>;
  initialReplacements: string[] | null;
}

export function SubstitutableExerciseRow({
  date,
  workoutId,
  exerciseName,
  sectionType,
  previousWeights,
  expectedSets,
  defaultReps,
  loggedSetsToday,
  initialReplacements,
}: SubstitutableExerciseRowProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [replacements, setReplacements] = useState<string[] | null>(initialReplacements);
  const [undoing, setUndoing] = useState(false);

  async function handleConfirm(newReplacements: string[]) {
    try {
      await saveExerciseSubstitution(workoutId, date, exerciseName, newReplacements);
      setReplacements(newReplacements);
      setPanelOpen(false);
    } catch {
      toast.error("Failed to save substitution");
    }
  }

  async function handleUndo() {
    setUndoing(true);
    try {
      await deleteExerciseSubstitution(workoutId, date, exerciseName);
      setReplacements(null);
    } catch {
      toast.error("Failed to remove substitution");
    } finally {
      setUndoing(false);
    }
  }

  if (replacements) {
    return (
      <div className="flex flex-col gap-1 py-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-on-surface-variant line-through opacity-40">
            {exerciseName}
          </span>
          <button
            onClick={handleUndo}
            disabled={undoing}
            className="text-[9px] font-bold uppercase tracking-widest text-outline hover:text-on-surface disabled:opacity-50"
          >
            {undoing ? "..." : "undo sub"}
          </button>
        </div>
        {replacements.map((name) => {
          const pw = previousWeights?.[name];
          const delta = pw?.prevWeight != null ? pw.weight - pw.prevWeight : null;
          return (
            <div key={name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-primary">↳</span>
                <span className="font-bold text-on-surface">{name}</span>
                <span className="text-[8px] font-bold uppercase tracking-widest text-outline">
                  sub
                </span>
                {pw && (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    PREV: {pw.weight}kg{pw.reps ? ` × ${pw.reps}` : ""}
                    {delta != null && delta !== 0 && (
                      <span className={delta > 0 ? "text-primary" : "text-red-400"}>
                        <span className="material-symbols-outlined align-middle text-xs">
                          {delta > 0 ? "arrow_upward" : "arrow_downward"}
                        </span>
                        {Math.abs(delta).toFixed(1)}kg
                      </span>
                    )}
                  </span>
                )}
              </div>
              <LogExerciseInline
                date={date}
                workoutId={workoutId}
                exerciseName={name}
                lastWeight={pw?.weight}
                lastReps={pw?.reps ?? undefined}
                defaultReps={defaultReps}
                sectionType={sectionType}
                expectedSets={expectedSets}
                initialLoggedCount={loggedSetsToday?.[name] ?? 0}
              />
            </div>
          );
        })}
      </div>
    );
  }

  const pw = previousWeights?.[exerciseName];
  const delta = pw?.prevWeight != null ? pw.weight - pw.prevWeight : null;

  return (
    <div>
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPanelOpen((o) => !o)}
            className="font-bold text-on-surface underline decoration-dotted underline-offset-2 hover:text-primary"
          >
            {exerciseName}
          </button>
          {pw && (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              PREV: {pw.weight}kg{pw.reps ? ` × ${pw.reps}` : ""}
              {delta != null && delta !== 0 && (
                <span className={delta > 0 ? "text-primary" : "text-red-400"}>
                  <span className="material-symbols-outlined align-middle text-xs">
                    {delta > 0 ? "arrow_upward" : "arrow_downward"}
                  </span>
                  {Math.abs(delta).toFixed(1)}kg
                </span>
              )}
            </span>
          )}
        </div>
        <LogExerciseInline
          date={date}
          workoutId={workoutId}
          exerciseName={exerciseName}
          lastWeight={pw?.weight}
          lastReps={pw?.reps ?? undefined}
          defaultReps={defaultReps}
          sectionType={sectionType}
          expectedSets={expectedSets}
          initialLoggedCount={loggedSetsToday?.[exerciseName] ?? 0}
        />
      </div>
      {panelOpen && (
        <ExerciseSubstitutionPanel
          onConfirm={handleConfirm}
          onCancel={() => setPanelOpen(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/substitutable-exercise-row.tsx
git commit -m "feat: add SubstitutableExerciseRow component"
```

---

## Task 5: Wire Up SectionDisplay + Workout Page

**Files:**
- Modify: `src/components/section-display.tsx`
- Modify: `src/app/(app)/workout/[date]/page.tsx`

### Part A — SectionDisplay

- [ ] **Step 1: Add imports and prop**

At the top of `src/components/section-display.tsx`, add the new component import:

```ts
import { SubstitutableExerciseRow } from "@/components/substitutable-exercise-row";
```

`@/lib/percentage` is **already imported** for `calculateWeight`. Extend that existing import to also pull in `normalizeLiftName`:

```ts
// Before:
import { calculateWeight } from "@/lib/percentage";
// After:
import { calculateWeight, normalizeLiftName } from "@/lib/percentage";
```

Add `substitutions` to the props interface:

```ts
interface SectionDisplayProps {
  section: { ... };  // existing
  userMax?: { maxWeight: number; unit: string } | null;
  date: string;
  workoutId: number;
  previousWeights?: Record<string, PreviousWeight>;
  loggedSetsToday?: Record<string, number>;
  substitutions?: Record<string, string[]>;   // ADD THIS
}
```

Add it to the destructured parameters:

```ts
export function SectionDisplay({ section, userMax, date, workoutId, previousWeights, loggedSetsToday, substitutions }: SectionDisplayProps) {
```

- [ ] **Step 2: Replace exercise row rendering with SubstitutableExerciseRow**

In `section-display.tsx`, find the non-percentage exercise rendering block (the `else` branch of `exercise.percentageSets ? ... : ...`). It currently looks like:

```tsx
) : (
  <div className="flex flex-col gap-1 py-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="font-bold text-on-surface">
          {exercise.name}
        </span>
        {previousWeights?.[exercise.name] && (() => {
          const pw = previousWeights[exercise.name];
          const delta = pw.prevWeight != null ? pw.weight - pw.prevWeight : null;
          return (
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              <span>
                PREV: {pw.weight}kg
                {pw.reps && ` × ${pw.reps}`}
              </span>
              {delta != null && delta !== 0 && (
                <span className={delta > 0 ? "text-primary" : "text-red-400"}>
                  <span className="material-symbols-outlined align-middle text-xs">
                    {delta > 0 ? "arrow_upward" : "arrow_downward"}
                  </span>
                  {Math.abs(delta).toFixed(1)}kg
                </span>
              )}
            </span>
          );
        })()}
      </div>
      {isLoggable && (
        <LogExerciseInline
          date={date}
          workoutId={workoutId}
          exerciseName={exercise.name}
          lastWeight={previousWeights?.[exercise.name]?.weight}
          lastReps={previousWeights?.[exercise.name]?.reps ?? undefined}
          defaultReps={parseDefaultReps(exercise.name) ?? sectionReps}
          sectionType={section.type}
          expectedSets={expectedSets}
          initialLoggedCount={loggedSetsToday?.[exercise.name] ?? 0}
        />
      )}
    </div>
  </div>
)}
```

Replace the entire `else` block with:

```tsx
) : (
  <div className="flex flex-col gap-1 py-2">
    {isLoggable ? (
      <SubstitutableExerciseRow
        date={date}
        workoutId={workoutId}
        exerciseName={exercise.name}
        sectionType={section.type}
        previousWeights={previousWeights}
        expectedSets={expectedSets}
        defaultReps={parseDefaultReps(exercise.name) ?? sectionReps}
        loggedSetsToday={loggedSetsToday}
        initialReplacements={substitutions?.[exercise.name.toLowerCase().trim()] ?? null}
      />
    ) : (
      <span className="font-bold text-on-surface">{exercise.name}</span>
    )}
  </div>
)}
```

`substitutions` keys are normalized via `normalizeLiftName` when saved. Use `normalizeLiftName(exercise.name)` (already imported in Step 1) to look up the key.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

### Part B — Workout Page

- [ ] **Step 4: Update BarbellDetail in the workout page**

In `src/app/(app)/workout/[date]/page.tsx`, find `BarbellDetail`. The current `Promise.all` block looks like:

```ts
const [userMax, estimated1RM, previousWeights, exerciseHistory, loggedSetsToday] = await Promise.all([
  liftName ? getUserMaxForLift(liftName) : null,
  liftName ? getEstimated1RM(liftName) : null,
  getLastLoggedWeights(strengthExerciseNames),
  getExerciseHistory(allLoggableNames, 10),
  getLoggedSetsForDate(date, allLoggableNames),
]);
```

Replace with this (fetch substitutions first so replacement names can be included):

```ts
const substitutions = await getExerciseSubstitutionsForDate(date, workout.id);
const replacementNames = Object.values(substitutions).flat();

const [userMax, estimated1RM, previousWeights, exerciseHistory, loggedSetsToday] = await Promise.all([
  liftName ? getUserMaxForLift(liftName) : null,
  liftName ? getEstimated1RM(liftName) : null,
  getLastLoggedWeights([...strengthExerciseNames, ...replacementNames]),
  getExerciseHistory([...allLoggableNames, ...replacementNames], 10),
  getLoggedSetsForDate(date, [...allLoggableNames, ...replacementNames]),
]);
```

- [ ] **Step 5: Add import for new actions**

At the top of `page.tsx`, add `getExerciseSubstitutionsForDate` to the existing import from `@/app/actions`:

```ts
import {
  getWorkoutByDate,
  getUserMaxForLift,
  getEstimated1RM,
  getLastLoggedWeights,
  getExerciseHistory,
  getWodResult,
  getUserProfile,
  getLoggedSetsForDate,
  getExerciseSubstitutionsForDate,   // ADD
} from "@/app/actions";
```

- [ ] **Step 6: Pass `substitutions` to SectionDisplay**

Find the `SectionDisplay` renders in `BarbellDetail`:

```tsx
<SectionDisplay
  key={i}
  section={section}
  userMax={section.type === "OLYMPIC LIFT" ? effectiveMax : undefined}
  date={date}
  workoutId={workout.id}
  previousWeights={previousWeights}
  loggedSetsToday={loggedSetsToday}
/>
```

Add `substitutions`:

```tsx
<SectionDisplay
  key={i}
  section={section}
  userMax={section.type === "OLYMPIC LIFT" ? effectiveMax : undefined}
  date={date}
  workoutId={workout.id}
  previousWeights={previousWeights}
  loggedSetsToday={loggedSetsToday}
  substitutions={substitutions}
/>
```

- [ ] **Step 7: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/section-display.tsx src/app/(app)/workout/[date]/page.tsx
git commit -m "feat: wire exercise substitution into workout page"
```

---

## Task 6: Manual Smoke Test + Push Live

- [ ] **Step 1: Run dev server**

```bash
npm run dev
```

- [ ] **Step 2: Smoke test — basic swap**

1. Open a barbell workout with an ACCESSORY or STRENGTH exercise
2. Tap the exercise name — dotted underline should be visible, panel should open
3. Type "Strict Press" — chip should appear, or type freely
4. Click CONFIRM — row should show strikethrough original + "↳ Strict Press (sub)" with LOG button
5. Refresh page — substitution should persist (row still shows Strict Press)
6. Click "undo sub" — original exercise name should restore

- [ ] **Step 3: Smoke test — split swap**

1. Tap exercise name, open panel
2. Type "Strict Press" in first field
3. Click "+ add second movement"
4. Type "Push Press" in second field
5. CONFIRM — two replacement rows should appear, each with their own LOG button
6. Log a set on one row, log a set on the other — verify both appear in exercise history

- [ ] **Step 4: Smoke test — autocomplete chips**

1. Open panel — first 5 chips should show from movement library (empty user history initially)
2. After logging a substitution, re-open panel on another exercise — the previously used name should appear as a chip

- [ ] **Step 5: Final type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Push live**

```bash
git push origin main
```
