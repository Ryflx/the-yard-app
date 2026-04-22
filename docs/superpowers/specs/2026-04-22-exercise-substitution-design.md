# Exercise Substitution — Design Spec

**Date:** 2026-04-22  
**Status:** Approved

---

## Problem

Barbell class members sometimes skip a programmed accessory exercise and do a different one (e.g. skipping Zercher Squats due to soreness, doing Strict Press + Push Press instead). Currently there is no way to record this — logging happens against the original exercise name, polluting history, or the set goes unlogged.

Goal: let users swap an accessory exercise for one or two replacements on a given day, log each replacement as an independent lift with its own history, and recover the substitution on refresh.

---

## Scope

- Applies to exercises in sections where `type === "ACCESSORY" || type.startsWith("STRENGTH")` — not Olympic Lift percentage rows (prescription-driven)
- Substitution is **per-user, per-date** — one-off, does not carry forward to future weeks
- Supports **1-to-1** (Zercher → Strict Press) and **1-to-2 split** (Zercher → Strict Press + Push Press)
- Max 2 replacement exercises per substitution

---

## Data Model

### New table: `user_exercise_substitutions`

```ts
userExerciseSubstitutions: pgTable("user_exercise_substitutions", {
  id:           serial("id").primaryKey(),
  userId:       text("user_id").notNull(),
  workoutId:    integer("workout_id").notNull().references(() => workouts.id),
  date:         text("date").notNull(),              // "YYYY-MM-DD"
  originalName: text("original_name").notNull(),     // normalized
  replacements: text("replacements").array().notNull(), // 1 or 2 normalized names
  createdAt:    timestamp("created_at").defaultNow(),
}, (t) => ({
  unique: uniqueIndex("user_exercise_substitutions_unique").on(t.userId, t.workoutId, t.date, t.originalName),
}))
```

Exercise names stored normalized via the existing `normalizeLiftName()`. This ensures "Strict Press" / "strict press" / "StrictPrs" all resolve to the same key.

### No new tables for autocomplete

Autocomplete candidates come from two existing sources queried at runtime:
1. Distinct `liftName` values from `userLiftLogs` for this user (personal history, most frequent first)
2. `name` from the `movements` table (library fallback)

---

## Server Actions

### `saveExerciseSubstitution(workoutId, date, originalName, replacements[])`
- Normalizes all names
- Upserts into `user_exercise_substitutions`
- Returns the saved record

### `getExerciseSubstitutionsForDate(date, workoutId)`
- Returns `Record<originalName, replacements[]>` for the current user
- Called server-side in the workout page alongside existing data fetches

### `getSubstitutionCandidates()`
- Returns all candidate exercise names for the current user (no query filter)
- Merges user's `userLiftLogs` distinct names + `movements` library names
- Ordered: user history frequency first, then library alphabetically
- Called **once when the swap panel opens** — filtering happens client-side as the user types, avoiding per-keystroke network requests

### `deleteExerciseSubstitution(workoutId, date, originalName)`
- Removes substitution (undo/revert)

---

## UI/UX Flow

### Triggering a swap

Every exercise name in ACCESSORY/STRENGTH sections renders with a subtle dotted underline. Tapping it opens an **inline swap panel** directly below the row:

```
┌─────────────────────────────────────────────┐
│ Swap exercise for today                      │
│ [Search or type...________________]          │
│ Recent: [Strict Press] [Push Press] [OHP]    │
│                                              │
│ + add second movement                        │
│                                [CANCEL] [CONFIRM] │
└─────────────────────────────────────────────┘
```

- Input is free-text with autocomplete dropdown (filtered as user types)
- Recent chips are the user's most-used substitutions, clickable to populate the field
- "+ add second movement" expands a second input row (split support)
- CONFIRM saves to DB and closes panel
- CANCEL closes without saving

### After confirming

The original exercise row is replaced by 1 or 2 substitution rows:

```
Zercher Squats  (skipped)
  ↳ Strict Press  (sub)  PREV: 60kg × 8    [LOG]
  ↳ Push Press   (sub)  PREV: 55kg × 4    [LOG]
                                    [undo sub]
```

- Each replacement row renders a full `LogExerciseInline` with last-logged weight populated
- `(sub)` badge makes substitution visible
- "undo sub" link calls `deleteExerciseSubstitution` and restores the original row

### Server-side hydration

The workout page fetches `getExerciseSubstitutionsForDate` in the existing `Promise.all` alongside `loggedSetsToday`. `SectionDisplay` receives substitutions as a prop and pre-renders replacement rows server-side — no loading state, no flicker on refresh.

The replacement exercise names must be included in the `getLastLoggedWeights` call so PREV weight populates correctly. The workout page resolves substitutions first, extracts replacement names, then adds them to the names passed to `getLastLoggedWeights`.

---

## Weight Suggestion

No formula. Rules:
- **User has logged this exercise before** → `getLastLoggedWeights` returns last weight/reps → shown as "PREV: Xkg × N"
- **No history** → empty input field, placeholder "kg" — same as any first-time exercise

---

## History & Progress Tracking

Each replacement exercise logs via the existing `logLift` action under its own normalized name. This means:
- "strict press" and "push press" each accumulate independent history
- Both appear in the exercise history/progress charts
- Either can eventually get its own 1RM
- No special-casing in existing logging logic

---

## Components Affected

| Component | Change |
|---|---|
| `src/db/schema.ts` | Add `userExerciseSubstitutions` table |
| `src/db/migrations/` | New migration file |
| `src/app/actions.ts` | Add 4 new server actions |
| `src/components/section-display.tsx` | Accept `substitutions` prop, render swap panel + sub rows |
| `src/components/exercise-substitution-panel.tsx` | New component — inline swap panel with autocomplete |
| `src/app/(app)/workout/[date]/page.tsx` | Fetch substitutions, pass to SectionDisplay |

---

## Out of Scope

- Olympic Lift percentage rows (prescription-driven, not substitutable)
- Substitution carrying forward to future weeks
- More than 2 replacement exercises
- Admin-level substitution overrides for all members
