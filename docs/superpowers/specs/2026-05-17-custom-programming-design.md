# Custom Programming Track — Design Spec

**Date:** 2026-05-17
**Status:** Approved
**Brainstorm:** Conversation 2026-05-17

---

## Problem

Members at the user's CrossFit gym (and CrossFit athletes generally) struggle to fit dedicated skill work — double unders, ring muscle-ups, handstand walks, etc. — into a weekly schedule already filled with classes. Hiring a personal coach is expensive; the WODprep coaching library exists but doesn't tell you *when* to do each session relative to your existing classes.

Goal: a third track inside barbell-tracker, alongside `BARBELL` and `CROSSFIT`, that:

1. Holds a curated library of WODprep skill courses (27 courses, scraped and structured).
2. Interviews the user about their goals, available time slots, and current weaknesses.
3. Generates an 8-week skill-work plan that weaves drill sessions around the user's existing classes.
4. Adapts the plan to the user via a hybrid scheduler — deterministic rules pick candidate sessions, Claude personalises selections and writes per-session rationales.
5. Surfaces the plan on the existing `/schedule` and `/workout/[date]` views, with logging via the existing completion-mode pattern.

---

## Scope

**In scope (v0 vertical slice):**

- Skill library ingest (the 27 WODprep courses) into a queryable Postgres catalogue
- New `CUSTOM` value in the `ClassType` union, with track tab + drill detail UI + completion logging
- Five-step interview wizard at `/programming/new`
- Weakness inference from existing `user_lift_logs` and `wod_results` (SQL + rules, no LLM)
- Hybrid plan generator — rules-based scheduler with Claude personalisation pass
- 8-week fixed plan length
- Feature spotlight tour for existing users (reuses + generalises the onboarding-tour component)

**Out of scope (deferred):**

- Adaptive re-planning (auto-advance milestones, regenerate when life happens) — v0 has a manual "regenerate" button only
- Configurable plan lengths (4 / 6 / 12 weeks)
- Plan sharing between users
- Per-skill PR tracking surface (data lives in `user_maxes` already, render later)
- Admin UI for editing the skill catalogue (curation overlay file is enough for now)
- Importing other course providers (WODprep-only in v0)

**Open questions resolved during brainstorm:**

| Question | Decision |
|---|---|
| First-spec scope | Full vertical slice with AI (#1 + #2 + #3 + #4 in one go) |
| AI involvement | Hybrid: rules pick candidate sessions, Claude personalises and explains |
| Plan length | Fixed 8 weeks for v0, configurable deferred |
| Where the WODprep JSONs live | Copy into this repo at `data/skill-library/` — no cross-repo dependency on `training-calendar` |

---

## Architecture

Three isolated subsystems:

| Subsystem | Purpose | Primary location |
|---|---|---|
| **Skill Library** | Read-side. WODprep courses queryable from the DB. Curated once, reused per user. | `data/skill-library/`, `src/db/seed-skill-library.ts`, `skill_courses` + `skill_drills` tables |
| **Plan Generator** | Write-side. Interview → goals → rules-based draft → LLM personalisation → persisted plan + `workouts` rows. | `src/lib/programming/{scheduler,personalise,weakness,validator,movement-patterns}.ts` |
| **Calendar Integration** | Render and log `CUSTOM` workouts on the existing schedule/workout pages. | `src/app/(app)/programming/*`, `src/components/custom-drill-detail.tsx`, edits to `class-type-tabs.tsx` and `workout/[date]/page.tsx` |

Boundaries are deliberate: the Skill Library exposes a query API consumed by the Plan Generator; the Plan Generator writes `workouts` rows that the Calendar Integration reads via the existing pipeline. The schedule page never needs to know that custom programming exists — it just renders `workouts` filtered by `classType`.

---

## Data Model

All new tables added to `src/db/schema.ts` and pushed via `drizzle-kit push` (the project does not maintain migration files).

### `skill_courses`

```ts
skillCourses: pgTable("skill_courses", {
  id:                     serial("id").primaryKey(),
  slug:                   text("slug").notNull().unique(),       // e.g. "double-under-foundations"
  name:                   text("name").notNull(),                 // e.g. "Double Under Foundations"
  source:                 text("source").notNull(),               // "wodprep"
  sourceUrl:              text("source_url").notNull(),
  totalWeeks:             integer("total_weeks").notNull(),
  category:               text("category").notNull(),             // jump_rope | gymnastics_pull | handstand | conditioning | mobility | lifting | weightlifting
  prerequisiteSkillId:    integer("prerequisite_skill_id"),       // self-FK, nullable
  difficulty:             integer("difficulty").notNull(),        // 1-5, curated
  estimatedSessionMinutes: integer("estimated_session_minutes").notNull(), // curated default
  drillsPerWeek:          integer("drills_per_week").notNull().default(1), // pacing hint from curation overlay
  createdAt:              timestamp("created_at").defaultNow().notNull(),
  updatedAt:              timestamp("updated_at").defaultNow().notNull(),
})
```

### `skill_drills`

```ts
skillDrills: pgTable("skill_drills", {
  id:                     serial("id").primaryKey(),
  courseId:               integer("course_id").notNull().references(() => skillCourses.id),
  week:                   integer("week").notNull(),
  orderInWeek:            integer("order_in_week").notNull(),
  externalId:             text("external_id").notNull(),          // e.g. "1.1"
  title:                  text("title").notNull(),
  sections:               jsonb("sections").notNull(),            // shape mirrors the WODprep JSON
  movementsSummary:       text("movements_summary").notNull(),    // denormalised for fast list rendering
  primaryMovementPatterns: text("primary_movement_patterns").array().notNull(), // {"pull","press","overhead",...}
}, (t) => ({
  uniqDrill: uniqueIndex("skill_drills_unique").on(t.courseId, t.externalId),
}))
```

### `custom_plans`

```ts
customPlans: pgTable("custom_plans", {
  id:                   serial("id").primaryKey(),
  userId:               text("user_id").notNull(),
  name:                 text("name").notNull(),                   // user-editable, default "8-Week Skill Plan"
  status:               text("status").notNull().default("active"), // active | paused | completed
  goalSummary:          text("goal_summary").notNull(),
  weeklyDrillSlots:     jsonb("weekly_drill_slots").notNull(),    // [{dow:'TUE', when:'after_class', minutes:30}]
  selectedSkillIds:     integer("selected_skill_ids").array().notNull(),
  planLengthWeeks:      integer("plan_length_weeks").notNull().default(8),
  startsOn:             text("starts_on").notNull(),              // "YYYY-MM-DD"
  endsOn:               text("ends_on").notNull(),
  generationMeta:       jsonb("generation_meta").notNull(),       // {rulesVersion, llmModel, generatedAt, llmFallbackUsed}
  createdAt:            timestamp("created_at").defaultNow().notNull(),
  updatedAt:            timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  oneActivePerUser: uniqueIndex("custom_plans_one_active")
    .on(t.userId)
    .where(sql`status = 'active'`),
}))
```

The partial unique index enforces *at most one active plan per user*.

### `custom_plan_sessions`

```ts
customPlanSessions: pgTable("custom_plan_sessions", {
  id:                serial("id").primaryKey(),
  planId:            integer("plan_id").notNull().references(() => customPlans.id, { onDelete: "cascade" }),
  workoutId:         integer("workout_id").references(() => workouts.id), // nullable until placed
  drillId:           integer("drill_id").notNull().references(() => skillDrills.id),
  originalDrillId:   integer("original_drill_id").references(() => skillDrills.id), // set when LLM swaps
  plannedDate:       text("planned_date").notNull(),              // "YYYY-MM-DD"
  plannedSlotMinutes: integer("planned_slot_minutes").notNull(),
  llmRationale:      text("llm_rationale"),                       // one-liner, nullable
  status:            text("status").notNull().default("pending"), // pending | completed | skipped | swapped
})
```

### `goal_questionnaires`

```ts
goalQuestionnaires: pgTable("goal_questionnaires", {
  id:        serial("id").primaryKey(),
  userId:    text("user_id").notNull(),
  planId:    integer("plan_id").references(() => customPlans.id), // nullable until plan persists
  answers:   jsonb("answers").notNull(),                          // raw wizard answers, audit trail
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
```

### `userProfiles` — add one column (existing table)

```ts
// added to existing userProfiles definition
seenTourModules: jsonb("seen_tour_modules").notNull().default(sql`'[]'::jsonb`),
// existing onboardingComplete boolean stays as-is for back-compat
```

Backfill (run in same `drizzle-kit push` cycle):

```sql
UPDATE user_profiles
SET seen_tour_modules = '["onboarding-v1"]'::jsonb
WHERE onboarding_complete = true;
```

### `workouts` — extend `ClassType` enum

`CUSTOM` added to the union. No structural change to the table.

---

## Ingest Pipeline

Source data: 27 WODprep course JSONs from `~/dev/personal/training-calendar/data/drills/*.json`, copied into this repo at `data/skill-library/`. Self-contained — no cross-repo dependency.

Hand-curated metadata overlay at `data/skill-library/curation.ts`, keyed by slug:

```ts
export const CURATION: Record<string, {
  category: SkillCategory;
  difficulty: 1 | 2 | 3 | 4 | 5;
  estimatedSessionMinutes: number;
  drillsPerWeek: number;
  prerequisiteSlug?: string;
}> = {
  "double-under-foundations": { category: "jump_rope", difficulty: 1, estimatedSessionMinutes: 20, drillsPerWeek: 2 },
  "double-under-pro":         { category: "jump_rope", difficulty: 3, estimatedSessionMinutes: 25, drillsPerWeek: 2, prerequisiteSlug: "double-under-foundations" },
  "ring-muscle-up-madness":   { category: "gymnastics_pull", difficulty: 4, estimatedSessionMinutes: 40, drillsPerWeek: 1 },
  // ... 27 total entries
};
```

Movement-pattern classifier at `src/lib/programming/movement-patterns.ts` — ~15 keyword rules mapping movement strings to pattern tags:

```ts
const PATTERNS: Array<{ match: RegExp; patterns: MovementPattern[] }> = [
  { match: /muscle ?up/i,         patterns: ["pull", "press"] },
  { match: /handstand|hspu/i,     patterns: ["press", "overhead"] },
  { match: /double under|du\b/i,  patterns: ["conditioning", "jump"] },
  { match: /toes to bar|t2b/i,    patterns: ["pull", "core"] },
  { match: /pistol/i,             patterns: ["squat", "unilateral"] },
  // ... ~15 total
];
```

Seed script: `src/db/seed-skill-library.ts`. Follows the existing `seed-*` TS pattern. Idempotent — upserts keyed by `(source, slug)` for courses and `(courseId, externalId)` for drills.

Run: `npx tsx src/db/seed-skill-library.ts`.

---

## Interview Flow

Multi-step wizard at `/programming/new`. Mobile-first, one step per card. State managed client-side until the final step calls `createPlan()`.

### Step 1 — Starting point

Auto-fills last-30-days stats server-side: total WODs logged, total lifts logged, mean RPE bucket. Renders three confidence sliders (1-5):

- Rope work (singles → double unders → crossovers)
- Handstands (kick-up → hold → walk)
- Pull gymnastics (kipping pull-up → C2B → MU)

User confirms an auto-detected `wodsPerWeek` int (editable).

No free-text fields in v0. `customPlans.goalSummary` is auto-templated from the slider answers + the skills picked in step 2, e.g. _"Improving double unders and ring muscle-ups over 8 weeks (3 sessions/week). Self-rated confidence: rope 2/5, handstand 3/5, pull gym 2/5."_

### Step 2 — What to improve

Multi-select skill picker grouped by `category`. The weakness inference (see next section) pre-ticks suggestions with a tooltip showing the reason ("you've never logged Rx on ring muscle-ups in 12 logged WODs that programmed them").

Hard limit: max 5 skills selected. Soft warning at 4: "more skills = thinner placement; we recommend 2-3 for 8 weeks".

### Step 3 — When you can train

Week grid Mon–Sun. Tap a day to add slots. Each slot has:

- `when`: `before_class` | `after_class` | `open_gym`
- `minutes`: 15 | 30 | 45 | 60

Slots are pure availability — they're not committed to specific skills yet.

### Step 4 — Plan length

Hard-coded "8 weeks" in v0, with copy saying "configurable plan lengths coming soon". Shows the computed `endsOn` date.

### Step 5 — Review & generate

Summary of picks → "Generating your plan…" loader → preview the first 2 weeks of placed sessions → **Commit** or **Tweak** (back to step 2).

If the rules-pass returned unplaceable drills, show a banner: "We couldn't fit X of Y sessions — add a slot or trim a skill to continue."

---

## Weakness Inference

Pure SQL + rules in `src/lib/programming/weakness.ts`. No LLM call.

Output type:

```ts
type WeaknessSignal = {
  skillId: number;
  signalStrength: number; // 0-1
  reason: string;         // user-facing tooltip text
};
```

Signals checked (in priority order):

| Signal | Source data | Reason copy template |
|---|---|---|
| **Movement gap (never logged Rx)** | `wod_results` where `rx_level != 'RX_PLUS' AND rx_level != 'RX'` AND `workouts.wod_movements` references the skill name | "You've never logged Rx on `{movement}` in `{count}` logged WODs that programmed it" |
| **High RPE on related lift** | `user_lift_logs` where `notes ILIKE '%rpe%'` (parsed) and mean RPE > 8.5 over last 30d, grouped by primary pattern | "Your overhead lifts are averaging RPE {avg} — overhead skill work may help" |
| **Frequency gap** | Zero rows in `wod_results` referencing a gymnastics movement in 14d AND ≥3 CrossFit `workouts` completed in 14d | "You're doing CrossFit but skipping gymnastics — pull / push gym work suggested" |
| **Failed completion** | `wod_results` with `roundsCompleted < prescribedRounds` AND `wod_movements` references a gymnastics movement | "You stopped short on `{wodName}` — `{movement}` may be the bottleneck" |

`signalStrength` is a hand-tuned float per signal type. Surfaced in interview step 2; the strongest 2 signals also appear as plain-text bullets at the top of step 2.

---

## Plan Generator — Hybrid Engine

Two passes, executed inside `createPlan()`.

### Pass 1 — Rules scheduler

`src/lib/programming/scheduler.ts`. Input: selected skills, weekly drill slots, plan length, plus all existing `workouts` for the user in the 8-week window.

```
algorithm placeDrills(skills, slots, existingWorkouts, startsOn, weeks):
  candidates = []
  for skill in skills:
    drills = fetchDrills(skill).orderBy(week, orderInWeek)  // WODprep is progressive
    pace = curation[skill.slug].drillsPerWeek
    for drill in drills:
      candidates.push({ drill, skillId: skill.id, pace })

  placements = []
  unplaceable = []
  slotCursor = buildSlotCalendar(slots, startsOn, weeks)   // ordered list of {date, when, minutes}
  candidatesBySkill = roundRobin(candidates by skillId)

  for candidate in candidatesBySkill:
    placed = false
    for slot in slotCursor.fromCursor():
      if slot.minutes < curation[candidate.drill.course.slug].estimatedSessionMinutes:
        continue
      if conflictsWithExisting(slot.date, candidate.drill, existingWorkouts):
        continue
      placements.push({ ...candidate, plannedDate: slot.date, plannedSlotMinutes: slot.minutes })
      slot.consume()
      placed = true
      break
    if not placed:
      unplaceable.push(candidate)

  return { placements, unplaceable }

conflictsWithExisting(date, drill, workouts):
  sameDay = workouts.filter(w => w.date == date)
  if sameDay.length >= 2: return true
  for w in workoutsInWindow(date - 1, date + 1):
    if patternsOverlap(w.primaryPatterns, drill.primaryMovementPatterns):
      return true
  return false
```

Rules version stored on the plan as `generation_meta.rulesVersion`.

### Pass 2 — LLM personalisation

`src/lib/programming/personalise.ts`. Uses `@anthropic-ai/sdk` with model `claude-haiku-4-5-20251001` (matching the existing `workout-parser.ts`).

Prompt inputs:

- `customPlans.goalSummary` (the auto-templated string from interview step 1)
- Weakness signals (top 5 by `signalStrength`)
- The draft schedule from pass 1 — an ordered array of `{ sessionIndex, drillId, courseName, drillTitle, plannedDate, plannedSlotMinutes }`, where `sessionIndex` is the array position (0-based)
- A digest of the last 14 days of logged activity (counts + movement-pattern frequencies; no free-text notes, no PII beyond what's on the user's own row)

Expected output (validated by `validator.ts`):

```ts
type LLMPersonalisation = {
  intro: string;                                                  // 2-3 lines for /programming overview
  sessionRationales: Array<{ sessionIndex: number; rationale: string }>;  // sessionIndex matches the draft schedule's 0-based position
  swaps: Array<{
    sessionIndex: number;                                         // index of session being swapped (in the draft schedule)
    newDrillId: number;                                           // replacement drill (must satisfy hard constraints below)
    reason: string;
  }>;
};
```

### Hard constraints (validated server-side)

A swap is **rejected silently** (drop the swap, keep the original placement) if any of:

- `newDrillId` is not in `selectedSkillIds`-derived drills
- `newDrillId`'s course differs from a course we'd never select
- `newDrillId`'s `estimatedSessionMinutes > plannedSlotMinutes`
- `sessionIndex` is out of range

If the LLM response fails JSON parse entirely, the validator throws; `createPlan()` catches, sets `generation_meta.llmFallbackUsed = true`, and persists the rules-only draft with no rationales.

### Persistence

Wrapped in a single Drizzle transaction:

1. Insert `custom_plans` row
2. Insert one `workouts` row per placement (with `classType = 'CUSTOM'`, `date = plannedDate`, sections derived from `skill_drills.sections`)
3. Insert `custom_plan_sessions` rows linking each `workouts.id` to its `drill_id`
4. Insert `goal_questionnaires` row with `planId` set
5. `revalidatePath('/schedule')` + `revalidatePath('/programming')`

---

## Calendar Integration

### `ClassTypeTabs`

Add `{ value: 'CUSTOM', label: 'CUSTOM' }` to `CLASS_TYPES`. Auto-select the CUSTOM tab if the user has an active plan (read on the server, passed as a prop or via URL param).

### `workout/[date]/page.tsx`

Add a `CustomDrillDetail` branch alongside `BarbellDetail` / `CrossFitDetail`:

```tsx
{workout.classType === "CUSTOM" && <CustomDrillDetail workout={workout} session={planSession} />}
```

Where `planSession` is fetched alongside the workout (a join on `custom_plan_sessions.workoutId`).

### `CustomDrillDetail` component (`src/components/custom-drill-detail.tsx`)

Renders, in order:

1. **Course context header** — `Double Under Foundations — Week 2 Workout 1`, with a back-link to the active plan's overview
2. **LLM rationale banner** — `llmRationale` if present, in a subtle accent box; absent silently if `llmFallbackUsed`
3. **Drill sections** — reuse the existing CrossFit section renderer (`WARM UP`, `SKILLS`, `TEST`, etc.)
4. **Completion log** — reuses the existing `WodScoreEntry` component and the `isCompletionMode()` branch from `src/lib/wod-scoring.ts` (the PR #13 work). For `CUSTOM` workouts, `isCompletionMode()` always returns true, so the entry surface is:
   - Toggle: completed Y/N
   - Optional free-text notes
   - Optional actual minutes
   - Persists to `wod_results` (same table as CrossFit). The exact `score_type` value follows whatever PR #13 uses for completion-mode entries — confirm at implementation time and reuse the same constant; do not introduce a new score_type for CUSTOM.
5. **Swap this session** button — opens a small sheet showing 2-3 alternate drills from the same course, calls `swapDrillSession()`
6. **Source link** — outbound link to `skill_courses.sourceUrl` (deep-link to the WODprep lesson if the user has the subscription)

### `/schedule` — no changes

Already iterates `workouts` for the date range filtered by `classType`. Custom sessions appear automatically once the `CUSTOM` enum value exists.

---

## Feature Spotlight Tour

Reuses and generalises the existing `OnboardingTour`. After the SW prompts users to refresh and they reload, the spotlight fires automatically the next time they land on `/schedule` — no new SW hook needed.

### Tour component refactor

`src/components/onboarding-tour.tsx`:

- `STEPS: TourStep[]` (hardcoded array) → `TOURS: Record<TourId, TourStep[]>`
- Component accepts `tourId: TourId` prop
- On finish/skip: calls renamed `markTourSeen(tourId)` action
- Old `completeOnboarding()` action becomes a thin wrapper: `markTourSeen('onboarding-v1')`

```ts
type TourId = 'onboarding-v1' | 'custom-programming-v1';

const TOURS: Record<TourId, TourStep[]> = {
  'onboarding-v1': [
    // ...existing 4 steps unchanged...
    { target: 'class-tabs-custom', title: 'New: Custom Programming',
      body: 'Build a personalised 8-week skill plan around your classes.', position: 'bottom' },
  ],
  'custom-programming-v1': [
    { target: 'class-tabs-custom', title: 'New: Custom Programming',
      body: 'Build a personalised 8-week skill plan around your classes.', position: 'bottom' },
    { target: 'programming-cta', title: 'Start your first plan',
      body: "Pick the skills you want to work on — we'll weave them into your week.", position: 'top' },
  ],
};
```

### Trigger logic

`src/app/(app)/schedule/page.tsx`:

```ts
const seen = profile?.seenTourModules ?? [];
const nextTour = pickNextTour(seen, profile?.onboardingComplete ?? false);

// Precedence:
//   1. 'onboarding-v1'         → if !onboardingComplete  (brand-new user)
//   2. 'custom-programming-v1' → if onboardingComplete AND 'custom-programming-v1' not in seen
//   3. null                    → no tour
```

When `onboarding-v1` completes for a brand-new user, `markTourSeen` writes **both** `'onboarding-v1'` and `'custom-programming-v1'` to `seenTourModules` in the same call — the onboarding tour already includes a step pointing at the CUSTOM tab, so a brand-new user doesn't need both tours back-to-back.

### New `data-tour` targets

- `data-tour="class-tabs-custom"` — on the CUSTOM tab in `ClassTypeTabs`. Always present once `CUSTOM` is in the enum.
- `data-tour="programming-cta"` — on the "Start your first plan" CTA shown in the CUSTOM tab's empty state (i.e. when the user has no active plan).

### Hooking into the refresh

No changes to `sw-register.tsx`. The flow:

1. User on old version → SW polls (60s) → new SW installs → sonner "Update available" toast.
2. User clicks Refresh → `controllerchange` → `window.location.reload()`.
3. Reload lands on `/schedule` → server reads `userProfiles.seenTourModules` → `pickNextTour()` returns `'custom-programming-v1'` → spotlight fires.
4. Tour completes → `markTourSeen('custom-programming-v1')` → won't fire again.

Edge case: user dismisses the Refresh toast and stays on old SW. They'll see the spotlight on next reload (whenever that happens). Acceptable.

### Forward compatibility

Adding a future spotlight (e.g. "configurable plan lengths v1") is now: append a tour to `TOURS`, add `data-tour` targets, add a precedence entry in `pickNextTour`. No schema change required.

---

## New Routes / Pages

| Route | Purpose |
|---|---|
| `/programming` | Active-plan overview: name + status, next-7-days session strip, per-course progress, "Regenerate plan" button, "Pause" / "Mark completed" actions. Empty state (no active plan): hero CTA → `/programming/new`. |
| `/programming/new` | The five-step interview wizard. |
| `/programming/skills/[slug]` | Single-course browse, read-only. Lists all drills with completion status if part of the active plan. |

**Per-course progress** = `count(plan_sessions where drill.courseId = X and status = 'completed') / count(plan_sessions where drill.courseId = X)`. Rendered as `Double Under Foundations — 3/9 sessions (33%)`.

---

## Server Actions

Added to `src/app/actions.ts` following the existing pattern (Clerk `auth()`, `revalidatePath()` after every mutation):

```ts
createPlan(answers: GoalAnswers, slots: WeeklySlots, skillIds: number[]): Promise<{ planId: number }>
// Runs both passes, persists transactionally, returns plan id.

getActivePlan(): Promise<{ plan: CustomPlan; sessions: CustomPlanSessionWithDrill[] } | null>
// Plan + upcoming sessions for the current user.

getWeaknessSignals(): Promise<WeaknessSignal[]>
// Called by the interview wizard step 2 to render suggestions.

swapDrillSession(sessionId: number): Promise<{ newDrillId: number }>
// Picks an alternate drill from the same course (filtering out ones already placed in this plan).
// Updates the `workouts` row + `custom_plan_sessions` (status='swapped', sets originalDrillId).

regeneratePlan(planId: number): Promise<{ planId: number }>
// Re-runs both passes starting from today. Keeps completed sessions intact (skips their dates).

pausePlan(planId: number): Promise<void>
markPlanCompleted(planId: number): Promise<void>

markTourSeen(tourId: TourId): Promise<void>
// Appends to userProfiles.seenTourModules (dedupe server-side).
// For 'onboarding-v1', also appends 'custom-programming-v1' so brand-new users don't see both.
```

All actions guard with Clerk `auth()` and 401 on no session. `getWeaknessSignals` is also exposed as a server-component-friendly helper for SSR use in step 2.

---

## Error Handling

| Failure | Behaviour |
|---|---|
| LLM call throws / times out | Catch in `createPlan()`. Set `generation_meta.llmFallbackUsed = true`. Persist rules-only draft. Banner on `/programming`: "AI personalisation wasn't available when this plan was generated — you can regenerate to retry." |
| LLM returns malformed JSON | Same as above — validator throws, treated identically. |
| LLM returns an invalid swap | Drop the swap silently. Keep the original placement. Log a server-side warning (no user surface — this is a quality signal, not a UX failure). |
| Rules-pass produces unplaceable drills | Surface count at wizard step 5: "We couldn't fit X of Y sessions in 8 weeks — add a slot or trim a skill." Block **Commit** until resolved. |
| Race on `active` plan creation | The partial unique index makes the second insert fail. The UI catches the Drizzle/Postgres error and shows: "You already have an active plan. View it or replace it?" with both buttons. |
| Ingest re-run | Idempotent — upsert by `(source, slug)` for courses and `(courseId, externalId)` for drills. Safe to run after every WODprep refresh. |
| User refreshes mid-wizard | Wizard state is client-side only. Re-entering `/programming/new` resets to step 1. (Acceptable for v0; persistence-resume is a future enhancement.) |

---

## Testing

Right-sized for the project's personal-project shipping rhythm — Vitest unit coverage on the load-bearing pure functions, manual smoke for the rest, verify on prod.

**Unit (Vitest, no live Neon):**

- `scheduler.ts` — conflict detection, round-robin fairness, unplaceable-drill reporting
- `weakness.ts` — each signal type with fixture rows
- `validator.ts` — every reject path (swap not in selected skills, wrong course, exceeds slot minutes, bad index, malformed JSON)
- `movement-patterns.ts` — every regex against representative drill names
- `pickNextTour()` — every precedence path

**Manual smoke before merge:**

1. Run `seed-skill-library.ts` against the dev DB.
2. Open `/programming/new`, complete the wizard with realistic picks (2 skills, 3 slots/week).
3. Confirm the generated plan appears on `/schedule` for the next 8 weeks.
4. Open one drill from `/workout/[date]`, log completion.
5. As an `onboardingComplete=true` user, refresh and confirm the spotlight fires; complete it and confirm it doesn't fire again.
6. As a brand-new user, complete onboarding and confirm the spotlight does **not** fire afterwards.

No e2e tests in v0.

---

## Implementation Order

Dependency-driven, designed so each chunk is independently shippable behind incomplete UI:

1. Schema additions + `drizzle-kit push` + backfill SQL (no UI yet)
2. Ingest pipeline + curation overlay + seed run (validates DB shape)
3. `CUSTOM` enum value + `class-type-tabs` + empty-state `CustomDrillDetail` (lets you see the tab)
4. Weakness inference SQL + unit tests
5. Rules scheduler + unit tests
6. LLM personalisation + validator + unit tests
7. `createPlan` server action + transactional persistence
8. Interview wizard UI (steps 1-5)
9. `/programming` overview page
10. Swap / regenerate / pause actions + UI
11. Tour component refactor + `seenTourModules` column + `pickNextTour`
12. New tour content + `data-tour` targets in `ClassTypeTabs` and the empty-state CTA
13. Smoke pass on prod

Full implementation plan to be produced by the `writing-plans` skill in the next step.

---
