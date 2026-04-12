# AI-Powered Workout Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace both CrossFit and Barbell workout builders with a unified AI-powered flow: paste text → AI parses → inline edit → save.

**Architecture:** Coach types/pastes a workout in plain text. A server action calls Claude Haiku to extract structured data (format, movements, reps, weights, score type). The parsed result is shown as an inline-editable preview. Bulk upload reads Excel/CSV client-side and sends each workout through the same parser. One unified flow replaces two separate builders.

**Tech Stack:** Next.js 16, Drizzle ORM (Neon Postgres), Anthropic SDK (`@anthropic-ai/sdk`), `xlsx` (SheetJS) for spreadsheet parsing, Tailwind CSS 4.

**Design spec:** `docs/superpowers/specs/2026-04-12-workout-builder-design.md`

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `src/lib/workout-parser.ts` | AI prompt construction, Anthropic SDK call, response validation, types |
| `src/components/workout-text-input.tsx` | Text area + date/class/title fields + parse button |
| `src/components/parsed-workout-editor.tsx` | Orchestrator: renders section editors, save/re-parse buttons |
| `src/components/wod-section-editor.tsx` | Inline editor for a WOD section (format, score type, movements) |
| `src/components/section-editor.tsx` | Inline editor for non-WOD sections (exercises with reps/weights) |
| `src/components/bulk-upload-flow.tsx` | File upload, sheet parsing, parsed workout list, bulk save |
| `src/app/(app)/admin/workouts/new/page.tsx` | New workout route |
| `src/app/(app)/admin/workouts/upload/page.tsx` | Bulk upload route |

### Modified files

| File | Change |
|------|--------|
| `src/db/schema.ts` | Add `WodFormat` type, `WodMovement` interface, new columns on `workoutSections`, extend `SectionExercise` |
| `src/app/actions.ts` | Add `parseWorkoutText` action, update `addWorkout`/`updateWorkout` to accept new fields |
| `src/app/(app)/admin/workouts/page.tsx` | Simplify to workout list + "New" / "Upload" buttons |
| `src/components/admin-workouts-client.tsx` | Remove builder toggle, show list with action links |
| `src/app/(app)/admin/workouts/edit/[id]/page.tsx` | Load existing workout into `ParsedWorkoutEditor` |

### Removed files (Task 10)

| File | Reason |
|------|--------|
| `src/components/crossfit-builder.tsx` | Replaced by AI-powered flow |
| `src/components/section-builder.tsx` | Replaced by `section-editor.tsx` |

---

### Task 1: Schema Migration — New Columns and Types

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Add WodFormat type and WodMovement interface**

Add these types after the existing `WodScoreType` definition (around line 43):

```typescript
export type WodFormat =
  | "FOR_TIME"
  | "ROUNDS_FOR_TIME"
  | "AMRAP"
  | "EMOM"
  | "DEATH_BY"
  | "INTERVAL"
  | "TABATA"
  | "MAX_LOAD";

export interface WodMovement {
  name: string;
  reps: string;
  weight: string | null;
  unit: string | null;
  note: string | null;
}
```

- [ ] **Step 2: Extend SectionExercise interface**

Replace the existing `SectionExercise` interface with:

```typescript
export interface SectionExercise {
  name: string;
  reps?: string;
  weight?: string;
  percentageSets?: PercentageSet[];
}
```

- [ ] **Step 3: Add new columns to workoutSections**

Add these columns to the `workoutSections` table definition, after the existing `rxWeights` column:

```typescript
  wodFormat: text("wod_format").$type<WodFormat>(),
  wodRounds: integer("wod_rounds"),
  wodInterval: integer("wod_interval"),
  wodDescription: text("wod_description"),
  wodMovements: jsonb("wod_movements").$type<WodMovement[]>(),
```

- [ ] **Step 4: Push schema changes to database**

Run:
```bash
npx drizzle-kit push
```
Expected: Schema changes applied, new columns added to `workout_sections` table.

- [ ] **Step 5: Verify build**

Run:
```bash
npx next build
```
Expected: Build succeeds. New types are exported and available.

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: add WodFormat, WodMovement types and new workout section columns"
```

---

### Task 2: Install Anthropic SDK and Configure API Key

**Files:**
- Modify: `package.json`
- Modify: `.env.local`

- [ ] **Step 1: Install the Anthropic SDK**

Run:
```bash
npm install @anthropic-ai/sdk
```

- [ ] **Step 2: Add ANTHROPIC_API_KEY to environment**

Add to `.env.local`:
```
ANTHROPIC_API_KEY=<the user's API key>
```

**Important:** Ask the user for their API key. Do NOT generate or guess one.

- [ ] **Step 3: Add ANTHROPIC_API_KEY to Vercel**

Remind the user to add `ANTHROPIC_API_KEY` to their Vercel project environment variables for production.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install @anthropic-ai/sdk for workout parsing"
```

---

### Task 3: AI Workout Parser

**Files:**
- Create: `src/lib/workout-parser.ts`
- Modify: `src/app/actions.ts`

- [ ] **Step 1: Create the parser module with types**

Create `src/lib/workout-parser.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import type {
  WodFormat,
  WodScoreType,
  WodMovement,
  SectionExercise,
  WorkoutSectionType,
  ClassType,
} from "@/db/schema";

export interface ParsedSection {
  type: WorkoutSectionType;
  sortOrder: number;
  exercises: SectionExercise[];
  sets?: string;
  liftName?: string;
  wodFormat?: WodFormat;
  wodScoreType?: WodScoreType;
  wodRounds?: number;
  wodInterval?: number;
  timeCap?: number;
  wodName?: string;
  rxWeights?: string;
  wodMovements?: WodMovement[];
  wodDescription?: string;
}

export interface ParsedWorkout {
  classType: ClassType;
  title: string;
  sections: ParsedSection[];
}

const FORMAT_SCORE_DEFAULTS: Record<string, WodScoreType> = {
  FOR_TIME: "TIME",
  ROUNDS_FOR_TIME: "TIME",
  AMRAP: "ROUNDS_REPS",
  EMOM: "ROUNDS_REPS",
  DEATH_BY: "ROUNDS_REPS",
  INTERVAL: "INTERVAL",
  TABATA: "ROUNDS_REPS",
  MAX_LOAD: "LOAD",
};

const SYSTEM_PROMPT = `You are a CrossFit and weightlifting workout parser. Given raw workout text written by a coach, extract structured data.

Return a JSON object matching this exact schema:
{
  "classType": "BARBELL" | "CROSSFIT",
  "title": "<suggested title if none given>",
  "sections": [
    {
      "type": "<one of: WARM UP, PRIMER, OLYMPIC LIFT, STRENGTH 1, STRENGTH 2, STRENGTH 3, ACCESSORY, COOL DOWN, STRENGTH, SKILL, HEAVY DAY, LOADING UP, WOD, ON RAMP>",
      "sortOrder": <integer starting at 0>,
      "exercises": [{"name": "<normalised name>", "reps": "<e.g. 10, 5x3, 3 rounds>", "weight": "<e.g. @ 75%, 32kg>", "percentageSets": [{"reps": "<e.g. 3>", "percentage": <number e.g. 70>}]}],
      "sets": "<e.g. 5 sets, 3x5>",
      "liftName": "<primary lift name for barbell sections>",
      "wodFormat": "<FOR_TIME | ROUNDS_FOR_TIME | AMRAP | EMOM | DEATH_BY | INTERVAL | TABATA | MAX_LOAD>",
      "wodScoreType": "<TIME | ROUNDS_REPS | LOAD | CALS | DISTANCE | INTERVAL>",
      "wodRounds": <number or null>,
      "wodInterval": <seconds or null>,
      "timeCap": <seconds or null>,
      "wodName": "<benchmark name if recognised, e.g. Fran, Cindy>",
      "rxWeights": "<summary e.g. 60/42.5kg>",
      "wodMovements": [{"name": "<normalised>", "reps": "<e.g. 21-15-9, 12, 800m>", "weight": "<e.g. 60/42.5kg>", "unit": "<kg, lb, cal, m>", "note": "<e.g. Odd minutes>"}],
      "wodDescription": "<raw text for this section>"
    }
  ]
}

Rules:
- Detect classType from content: percentage-based Olympic/strength work = BARBELL, WODs/AMRAPs/EMOMs = CROSSFIT
- For barbell sections with percentages (e.g. "3@70%, 2@80%"), populate percentageSets array
- For WOD sections, populate BOTH wodMovements (structured) AND wodDescription (raw text)
- Non-WOD sections: populate exercises array, leave wod* fields null
- Normalise movement abbreviations: C2B→Chest-to-Bar Pull-up, T2B→Toes-to-Bar, HSPU→Handstand Push-up, DU→Double-Under, MU→Muscle-Up, PC→Power Clean, S2OH→Shoulder-to-Overhead, Cal Row→Calorie Row, KB→Kettlebell
- Recognise benchmark WODs by name (Fran, Cindy, Murph, etc.) and set wodName
- For EMOM: wodInterval = seconds per interval (usually 60), wodRounds = total minutes
- For Tabata: wodInterval = 20, wodRounds = 8
- For "X Rounds For Time": wodFormat = ROUNDS_FOR_TIME, wodRounds = X
- Infer wodScoreType from format: AMRAP→ROUNDS_REPS, For Time→TIME, EMOM→ROUNDS_REPS, Max Load→LOAD
- timeCap in seconds (12 min = 720)
- If the coach wrote section headers (Warm Up:, Strength:, WOD:, etc.), use them. If not, infer sections from content.
- Include ALL sections from the text — warm ups, strength, skill, WOD, cool down, on ramp
- Only include fields that have values — omit null/empty fields`;

export async function parseWorkoutWithAI(text: string, movementNames: string[]): Promise<ParsedWorkout> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const client = new Anthropic({ apiKey });

  const movementHint = movementNames.length > 0
    ? `\n\nKnown movements in the database (normalise to these exact names when possible):\n${movementNames.join(", ")}`
    : "";

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: SYSTEM_PROMPT + movementHint,
    messages: [{ role: "user", content: text }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");

  const parsed = JSON.parse(jsonMatch[0]) as ParsedWorkout;

  for (const section of parsed.sections) {
    section.sortOrder = parsed.sections.indexOf(section);
    if (section.wodFormat && !section.wodScoreType) {
      section.wodScoreType = FORMAT_SCORE_DEFAULTS[section.wodFormat] ?? "TIME";
    }
  }

  return parsed;
}
```

- [ ] **Step 2: Add the parseWorkoutText server action**

Add to `src/app/actions.ts`, after the existing imports:

Add import at top of file:
```typescript
import { parseWorkoutWithAI, type ParsedWorkout, type ParsedSection } from "@/lib/workout-parser";
```

Add the server action:
```typescript
export async function parseWorkoutText(input: {
  text: string;
}): Promise<ParsedWorkout> {
  const allMovements = await db.select({ name: movements.name }).from(movements);
  const movementNames = allMovements.map((m) => m.name);
  return parseWorkoutWithAI(input.text, movementNames);
}
```

- [ ] **Step 3: Verify build**

Run:
```bash
npx next build
```
Expected: Build succeeds. The parser module compiles.

- [ ] **Step 4: Commit**

```bash
git add src/lib/workout-parser.ts src/app/actions.ts
git commit -m "feat: add AI workout parser with Claude Haiku integration"
```

---

### Task 4: Update Server Actions for New Schema Fields

**Files:**
- Modify: `src/app/actions.ts`

- [ ] **Step 1: Update the addWorkout action**

Replace the existing `addWorkout` function (around line 647) with:

```typescript
export async function addWorkout(data: {
  date: string;
  title: string;
  classType?: ClassType;
  sections: {
    type: WorkoutSectionType;
    sets?: string;
    liftName?: string;
    exercises: SectionExercise[];
    wodScoreType?: WodScoreType;
    timeCap?: number;
    wodName?: string;
    rxWeights?: string;
    wodFormat?: WodFormat;
    wodRounds?: number;
    wodInterval?: number;
    wodDescription?: string;
    wodMovements?: WodMovement[];
  }[];
}) {
  const [workout] = await db
    .insert(workouts)
    .values({ date: data.date, title: data.title, classType: data.classType ?? "BARBELL" })
    .returning();

  for (let i = 0; i < data.sections.length; i++) {
    const section = data.sections[i];
    await db.insert(workoutSections).values({
      workoutId: workout.id,
      type: section.type,
      sortOrder: i,
      liftName: section.liftName ?? null,
      sets: section.sets ?? null,
      exercises: section.exercises,
      wodScoreType: section.wodScoreType ?? null,
      timeCap: section.timeCap ?? null,
      wodName: section.wodName ?? null,
      rxWeights: section.rxWeights ?? null,
      wodFormat: section.wodFormat ?? null,
      wodRounds: section.wodRounds ?? null,
      wodInterval: section.wodInterval ?? null,
      wodDescription: section.wodDescription ?? null,
      wodMovements: section.wodMovements ?? null,
    });
  }

  revalidatePath("/schedule");
  revalidatePath("/admin/workouts");
  return workout;
}
```

- [ ] **Step 2: Update the updateWorkout action**

Replace the existing `updateWorkout` function (around line 687) with:

```typescript
export async function updateWorkout(
  workoutId: number,
  data: {
    date: string;
    title: string;
    classType?: ClassType;
    sections: {
      type: WorkoutSectionType;
      sets?: string;
      liftName?: string;
      exercises: SectionExercise[];
      wodScoreType?: WodScoreType;
      timeCap?: number;
      wodName?: string;
      rxWeights?: string;
      wodFormat?: WodFormat;
      wodRounds?: number;
      wodInterval?: number;
      wodDescription?: string;
      wodMovements?: WodMovement[];
    }[];
  }
) {
  await db.update(workouts).set({
    date: data.date,
    title: data.title,
    classType: data.classType ?? "BARBELL",
  }).where(eq(workouts.id, workoutId));
  await db.delete(workoutSections).where(eq(workoutSections.workoutId, workoutId));

  for (let i = 0; i < data.sections.length; i++) {
    const section = data.sections[i];
    await db.insert(workoutSections).values({
      workoutId,
      type: section.type,
      sortOrder: i,
      liftName: section.liftName ?? null,
      sets: section.sets ?? null,
      exercises: section.exercises,
      wodScoreType: section.wodScoreType ?? null,
      timeCap: section.timeCap ?? null,
      wodName: section.wodName ?? null,
      rxWeights: section.rxWeights ?? null,
      wodFormat: section.wodFormat ?? null,
      wodRounds: section.wodRounds ?? null,
      wodInterval: section.wodInterval ?? null,
      wodDescription: section.wodDescription ?? null,
      wodMovements: section.wodMovements ?? null,
    });
  }

  revalidatePath("/schedule");
  revalidatePath("/admin/workouts");
}
```

- [ ] **Step 3: Add WodFormat and WodMovement imports**

Update the import line in `src/app/actions.ts` to include the new types:

```typescript
import type { SectionExercise, WorkoutSectionType, MovementCategory, ClassType, WodScoreType, WodFormat, WodMovement } from "@/db/schema";
```

- [ ] **Step 4: Verify build**

Run:
```bash
npx next build
```
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/actions.ts
git commit -m "feat: update addWorkout/updateWorkout for new schema fields"
```

---

### Task 5: Section Editor Component (Non-WOD)

**Files:**
- Create: `src/components/section-editor.tsx`

- [ ] **Step 1: Create the section editor component**

Create `src/components/section-editor.tsx`:

```typescript
"use client";

import { useState } from "react";
import type { SectionExercise, WorkoutSectionType, PercentageSet } from "@/db/schema";

interface SectionEditorProps {
  type: WorkoutSectionType;
  exercises: SectionExercise[];
  sets?: string;
  liftName?: string;
  onChange: (data: { exercises: SectionExercise[]; sets?: string; liftName?: string }) => void;
}

const SECTION_COLORS: Record<string, { bg: string; text: string }> = {
  "WARM UP": { bg: "#33333380", text: "#aaaaaa" },
  PRIMER: { bg: "#33333380", text: "#aaaaaa" },
  STRENGTH: { bg: "#2563eb20", text: "#60a5fa" },
  "STRENGTH 1": { bg: "#2563eb20", text: "#60a5fa" },
  "STRENGTH 2": { bg: "#2563eb20", text: "#60a5fa" },
  "STRENGTH 3": { bg: "#2563eb20", text: "#60a5fa" },
  SKILL: { bg: "#7c3aed20", text: "#a78bfa" },
  "HEAVY DAY": { bg: "#dc262620", text: "#f87171" },
  "LOADING UP": { bg: "#eab30820", text: "#fbbf24" },
  "OLYMPIC LIFT": { bg: "#eab30820", text: "#fbbf24" },
  ACCESSORY: { bg: "#33333380", text: "#aaaaaa" },
  "COOL DOWN": { bg: "#33333380", text: "#aaaaaa" },
  "ON RAMP": { bg: "#33333380", text: "#aaaaaa" },
};

export function SectionEditor({ type, exercises, sets, liftName, onChange }: SectionEditorProps) {
  const [editing, setEditing] = useState<number | null>(null);
  const colors = SECTION_COLORS[type] ?? { bg: "#33333380", text: "#aaaaaa" };

  function updateExercise(index: number, updated: SectionExercise) {
    const next = [...exercises];
    next[index] = updated;
    onChange({ exercises: next, sets, liftName });
  }

  function removeExercise(index: number) {
    onChange({ exercises: exercises.filter((_, i) => i !== index), sets, liftName });
  }

  function addExercise() {
    onChange({ exercises: [...exercises, { name: "" }], sets, liftName });
  }

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-2">
        <span
          className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {type}
        </span>
        {sets && (
          <input
            className="bg-transparent text-xs text-outline outline-none"
            value={sets}
            onChange={(e) => onChange({ exercises, sets: e.target.value, liftName })}
            placeholder="e.g. 5 sets"
          />
        )}
      </div>

      <div className="bg-surface-container">
        {liftName && (
          <div className="flex items-center justify-between border-b border-surface-container-highest px-4 py-3">
            <input
              className="bg-transparent font-headline text-sm font-bold text-on-surface outline-none"
              value={liftName}
              onChange={(e) => onChange({ exercises, sets, liftName: e.target.value })}
            />
          </div>
        )}

        {exercises.map((ex, i) => (
          <div key={i} className="flex items-center gap-2 border-b border-surface-container-highest px-4 py-2">
            {editing === i ? (
              <>
                <input
                  className="w-12 bg-surface-container-high px-2 py-1 text-center text-xs font-bold text-primary outline-none"
                  value={ex.reps ?? ""}
                  onChange={(e) => updateExercise(i, { ...ex, reps: e.target.value })}
                  placeholder="reps"
                  autoFocus
                />
                <input
                  className="flex-1 bg-surface-container-high px-2 py-1 text-xs text-on-surface outline-none"
                  value={ex.name}
                  onChange={(e) => updateExercise(i, { ...ex, name: e.target.value })}
                  placeholder="Exercise name"
                />
                <input
                  className="w-20 bg-surface-container-high px-2 py-1 text-right text-xs text-outline outline-none"
                  value={ex.weight ?? ""}
                  onChange={(e) => updateExercise(i, { ...ex, weight: e.target.value })}
                  placeholder="weight"
                />
                <button onClick={() => setEditing(null)} className="text-xs text-primary">
                  done
                </button>
              </>
            ) : (
              <>
                <span className="w-8 text-sm font-bold text-primary">{ex.reps}</span>
                <span className="flex-1 text-xs text-on-surface">{ex.name || "—"}</span>
                {ex.weight && <span className="text-xs text-outline">{ex.weight}</span>}
                <button onClick={() => setEditing(i)} className="text-xs text-outline hover:text-primary">
                  <span className="material-symbols-outlined text-sm">edit</span>
                </button>
                <button onClick={() => removeExercise(i)} className="text-xs text-outline hover:text-error">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </>
            )}
          </div>
        ))}

        <button
          onClick={addExercise}
          className="w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-primary"
        >
          + Add exercise
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run:
```bash
npx next build
```
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/section-editor.tsx
git commit -m "feat: add inline section editor for non-WOD workout sections"
```

---

### Task 6: WOD Section Editor Component

**Files:**
- Create: `src/components/wod-section-editor.tsx`

- [ ] **Step 1: Create the WOD section editor component**

Create `src/components/wod-section-editor.tsx`:

```typescript
"use client";

import { useState } from "react";
import type { WodFormat, WodScoreType, WodMovement } from "@/db/schema";

interface WodSectionEditorProps {
  wodFormat?: WodFormat;
  wodScoreType?: WodScoreType;
  wodRounds?: number;
  wodInterval?: number;
  timeCap?: number;
  wodName?: string;
  rxWeights?: string;
  wodMovements: WodMovement[];
  wodDescription?: string;
  onChange: (data: {
    wodFormat?: WodFormat;
    wodScoreType?: WodScoreType;
    wodRounds?: number;
    wodInterval?: number;
    timeCap?: number;
    wodName?: string;
    rxWeights?: string;
    wodMovements: WodMovement[];
    wodDescription?: string;
  }) => void;
}

const WOD_FORMATS: { value: WodFormat; label: string }[] = [
  { value: "FOR_TIME", label: "FOR TIME" },
  { value: "ROUNDS_FOR_TIME", label: "ROUNDS FOR TIME" },
  { value: "AMRAP", label: "AMRAP" },
  { value: "EMOM", label: "EMOM" },
  { value: "DEATH_BY", label: "DEATH BY" },
  { value: "INTERVAL", label: "INTERVAL" },
  { value: "TABATA", label: "TABATA" },
  { value: "MAX_LOAD", label: "MAX LOAD" },
];

const SCORE_TYPES: { value: WodScoreType; label: string }[] = [
  { value: "TIME", label: "TIME" },
  { value: "ROUNDS_REPS", label: "ROUNDS + REPS" },
  { value: "LOAD", label: "LOAD" },
  { value: "CALS", label: "CALS" },
  { value: "DISTANCE", label: "DISTANCE" },
  { value: "INTERVAL", label: "INTERVAL" },
];

function formatTimeCap(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${m}:00`;
}

function parseTimeCap(value: string): number {
  const parts = value.split(":");
  const m = parseInt(parts[0]) || 0;
  const s = parseInt(parts[1]) || 0;
  return m * 60 + s;
}

export function WodSectionEditor({
  wodFormat,
  wodScoreType,
  wodRounds,
  wodInterval,
  timeCap,
  wodName,
  rxWeights,
  wodMovements,
  wodDescription,
  onChange,
}: WodSectionEditorProps) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  function update(partial: Partial<WodSectionEditorProps>) {
    onChange({
      wodFormat, wodScoreType, wodRounds, wodInterval, timeCap,
      wodName, rxWeights, wodMovements, wodDescription,
      ...partial,
    });
  }

  function updateMovement(index: number, updated: WodMovement) {
    const next = [...wodMovements];
    next[index] = updated;
    update({ wodMovements: next });
  }

  function removeMovement(index: number) {
    update({ wodMovements: wodMovements.filter((_, i) => i !== index) });
  }

  function addMovement() {
    update({
      wodMovements: [...wodMovements, { name: "", reps: "", weight: null, unit: null, note: null }],
    });
  }

  const showRounds = wodFormat === "ROUNDS_FOR_TIME" || wodFormat === "EMOM" || wodFormat === "TABATA" || wodFormat === "DEATH_BY";
  const showInterval = wodFormat === "EMOM" || wodFormat === "TABATA" || wodFormat === "INTERVAL";

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest" style={{ backgroundColor: "#dc262620", color: "#f87171" }}>
          WOD
        </span>
        {wodName && (
          <span className="text-xs font-bold text-on-surface">{wodName}</span>
        )}
      </div>

      <div className="bg-surface-container overflow-hidden">
        {/* Format, Score Type, Time Cap row */}
        <div className="flex border-b border-surface-container-highest">
          <div className="flex-1 border-r border-surface-container-highest px-3 py-2">
            <span className="block text-[9px] font-bold uppercase tracking-widest text-outline">FORMAT</span>
            <select
              className="mt-1 w-full bg-transparent text-xs font-bold text-on-surface outline-none"
              value={wodFormat ?? ""}
              onChange={(e) => update({ wodFormat: e.target.value as WodFormat })}
            >
              <option value="">—</option>
              {WOD_FORMATS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 border-r border-surface-container-highest px-3 py-2">
            <span className="block text-[9px] font-bold uppercase tracking-widest text-outline">SCORE TYPE</span>
            <select
              className="mt-1 w-full bg-transparent text-xs font-bold text-on-surface outline-none"
              value={wodScoreType ?? ""}
              onChange={(e) => update({ wodScoreType: e.target.value as WodScoreType })}
            >
              <option value="">—</option>
              {SCORE_TYPES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="px-3 py-2">
            <span className="block text-[9px] font-bold uppercase tracking-widest text-outline">TIME CAP</span>
            <input
              className="mt-1 w-16 bg-transparent text-xs font-bold text-on-surface outline-none"
              value={timeCap ? formatTimeCap(timeCap) : ""}
              onChange={(e) => update({ timeCap: parseTimeCap(e.target.value) })}
              placeholder="MM:SS"
            />
          </div>
        </div>

        {/* Rounds / Interval row (conditional) */}
        {(showRounds || showInterval) && (
          <div className="flex border-b border-surface-container-highest">
            {showRounds && (
              <div className="flex-1 border-r border-surface-container-highest px-3 py-2">
                <span className="block text-[9px] font-bold uppercase tracking-widest text-outline">ROUNDS</span>
                <input
                  type="number"
                  className="mt-1 w-16 bg-transparent text-xs font-bold text-on-surface outline-none"
                  value={wodRounds ?? ""}
                  onChange={(e) => update({ wodRounds: parseInt(e.target.value) || undefined })}
                />
              </div>
            )}
            {showInterval && (
              <div className="flex-1 px-3 py-2">
                <span className="block text-[9px] font-bold uppercase tracking-widest text-outline">INTERVAL (sec)</span>
                <input
                  type="number"
                  className="mt-1 w-16 bg-transparent text-xs font-bold text-on-surface outline-none"
                  value={wodInterval ?? ""}
                  onChange={(e) => update({ wodInterval: parseInt(e.target.value) || undefined })}
                />
              </div>
            )}
          </div>
        )}

        {/* Movements */}
        <div className="px-3 py-2">
          {wodMovements.map((mov, i) => (
            <div key={i} className="flex items-center gap-2 border-b border-surface-container-highest py-2">
              {editingIdx === i ? (
                <>
                  <input
                    className="w-16 bg-surface-container-high px-2 py-1 text-center text-xs font-bold text-primary outline-none"
                    value={mov.reps}
                    onChange={(e) => updateMovement(i, { ...mov, reps: e.target.value })}
                    placeholder="reps"
                    autoFocus
                  />
                  <input
                    className="flex-1 bg-surface-container-high px-2 py-1 text-xs text-on-surface outline-none"
                    value={mov.name}
                    onChange={(e) => updateMovement(i, { ...mov, name: e.target.value })}
                    placeholder="Movement"
                  />
                  <input
                    className="w-24 bg-surface-container-high px-2 py-1 text-right text-xs text-outline outline-none"
                    value={mov.weight ?? ""}
                    onChange={(e) => updateMovement(i, { ...mov, weight: e.target.value || null })}
                    placeholder="weight"
                  />
                  <button onClick={() => setEditingIdx(null)} className="text-xs text-primary">done</button>
                </>
              ) : (
                <>
                  <span className="w-10 text-sm font-bold text-primary">{mov.reps}</span>
                  <span className="flex-1 text-xs text-on-surface">{mov.name || "—"}</span>
                  {mov.weight && <span className="text-xs text-outline">{mov.weight}</span>}
                  {mov.note && <span className="text-[9px] italic text-outline">{mov.note}</span>}
                  <button onClick={() => setEditingIdx(i)} className="text-xs text-outline hover:text-primary">
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                  <button onClick={() => removeMovement(i)} className="text-xs text-outline hover:text-error">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </>
              )}
            </div>
          ))}
          <button
            onClick={addMovement}
            className="mt-2 text-[10px] font-bold uppercase tracking-widest text-primary"
          >
            + Add movement
          </button>
        </div>

        {/* RX Weights */}
        <div className="flex items-center justify-between border-t border-surface-container-highest px-3 py-2">
          <span className="text-[9px] font-bold uppercase tracking-widest text-outline">RX WEIGHTS</span>
          <input
            className="bg-transparent text-right text-xs text-on-surface-variant outline-none"
            value={rxWeights ?? ""}
            onChange={(e) => update({ rxWeights: e.target.value })}
            placeholder="e.g. 60/42.5kg"
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run:
```bash
npx next build
```
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/wod-section-editor.tsx
git commit -m "feat: add inline WOD section editor with format, movements, and scoring"
```

---

### Task 7: Parsed Workout Editor (Orchestrator)

**Files:**
- Create: `src/components/parsed-workout-editor.tsx`

- [ ] **Step 1: Create the parsed workout editor**

Create `src/components/parsed-workout-editor.tsx`:

```typescript
"use client";

import { useState } from "react";
import { addWorkout, updateWorkout } from "@/app/actions";
import type { ClassType } from "@/db/schema";
import type { ParsedSection } from "@/lib/workout-parser";
import { SectionEditor } from "./section-editor";
import { WodSectionEditor } from "./wod-section-editor";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ParsedWorkoutEditorProps {
  classType: ClassType;
  title: string;
  date: string;
  sections: ParsedSection[];
  editingWorkoutId?: number;
  onReparse?: () => void;
}

export function ParsedWorkoutEditor({
  classType: initialClassType,
  title: initialTitle,
  date: initialDate,
  sections: initialSections,
  editingWorkoutId,
  onReparse,
}: ParsedWorkoutEditorProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [classType, setClassType] = useState<ClassType>(initialClassType);
  const [title, setTitle] = useState(initialTitle);
  const [date, setDate] = useState(initialDate);
  const [sections, setSections] = useState<ParsedSection[]>(initialSections);

  function updateSection(index: number, partial: Partial<ParsedSection>) {
    const next = [...sections];
    next[index] = { ...next[index], ...partial };
    setSections(next);
  }

  function removeSection(index: number) {
    setSections(sections.filter((_, i) => i !== index));
  }

  function addSection() {
    setSections([
      ...sections,
      { type: "WOD", sortOrder: sections.length, exercises: [], wodMovements: [] },
    ]);
  }

  async function handleSave() {
    if (!date) { toast.error("Pick a date"); return; }
    if (!title.trim()) { toast.error("Enter a title"); return; }

    setSaving(true);
    try {
      const payload = {
        date,
        title: title.trim(),
        classType,
        sections: sections
          .filter((s) => {
            if (s.type === "WOD") return (s.wodMovements?.length ?? 0) > 0 || s.wodDescription;
            return s.exercises.length > 0 && s.exercises.some((e) => e.name.trim());
          })
          .map((s) => ({
            type: s.type,
            sets: s.sets,
            liftName: s.liftName,
            exercises: s.exercises,
            wodScoreType: s.wodScoreType,
            timeCap: s.timeCap,
            wodName: s.wodName,
            rxWeights: s.rxWeights,
            wodFormat: s.wodFormat,
            wodRounds: s.wodRounds,
            wodInterval: s.wodInterval,
            wodDescription: s.wodDescription,
            wodMovements: s.wodMovements,
          })),
      };

      if (editingWorkoutId) {
        await updateWorkout(editingWorkoutId, payload);
        toast.success("Workout updated");
      } else {
        await addWorkout(payload);
        toast.success("Workout saved");
      }
      router.push("/admin/workouts");
      router.refresh();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-sm text-primary">← Back</button>
          <input
            className="bg-transparent font-headline text-lg font-bold text-on-surface outline-none"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Workout title"
          />
        </div>
        <span className="bg-primary/10 px-2 py-1 text-[9px] font-bold text-primary">
          {editingWorkoutId ? "EDITING" : "AI PARSED"}
        </span>
      </div>

      {/* Date + Class Type */}
      <div className="flex gap-3">
        <div className="flex-1 bg-surface-container px-3 py-2">
          <span className="block text-[9px] font-bold uppercase tracking-widest text-outline">DATE</span>
          <input
            type="date"
            className="mt-1 w-full bg-transparent text-sm text-on-surface outline-none"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="bg-surface-container px-3 py-2">
          <span className="block text-[9px] font-bold uppercase tracking-widest text-outline">CLASS</span>
          <div className="mt-1 flex gap-1">
            {(["BARBELL", "CROSSFIT"] as const).map((ct) => (
              <button
                key={ct}
                onClick={() => setClassType(ct)}
                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                  classType === ct
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-highest text-outline"
                }`}
              >
                {ct}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sections */}
      {sections.map((section, i) =>
        section.type === "WOD" ? (
          <div key={i} className="relative">
            <button
              onClick={() => removeSection(i)}
              className="absolute right-0 top-0 z-10 p-1 text-outline hover:text-error"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
            <WodSectionEditor
              wodFormat={section.wodFormat}
              wodScoreType={section.wodScoreType}
              wodRounds={section.wodRounds}
              wodInterval={section.wodInterval}
              timeCap={section.timeCap}
              wodName={section.wodName}
              rxWeights={section.rxWeights}
              wodMovements={section.wodMovements ?? []}
              wodDescription={section.wodDescription}
              onChange={(data) => updateSection(i, data)}
            />
          </div>
        ) : (
          <div key={i} className="relative">
            <button
              onClick={() => removeSection(i)}
              className="absolute right-0 top-0 z-10 p-1 text-outline hover:text-error"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
            <SectionEditor
              type={section.type}
              exercises={section.exercises}
              sets={section.sets}
              liftName={section.liftName}
              onChange={(data) => updateSection(i, { exercises: data.exercises, sets: data.sets, liftName: data.liftName })}
            />
          </div>
        )
      )}

      <button
        onClick={addSection}
        className="w-full border border-dashed border-outline/30 py-3 text-[10px] font-bold uppercase tracking-widest text-outline"
      >
        + Add section
      </button>

      {/* Actions */}
      <div className="flex gap-3">
        {onReparse && (
          <button
            onClick={onReparse}
            className="flex-1 border border-surface-container-highest py-3 text-[10px] font-bold uppercase tracking-widest text-outline"
          >
            ↻ RE-PARSE
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-[2] bg-primary py-3 font-headline text-[11px] font-bold uppercase tracking-widest text-on-primary disabled:opacity-50"
        >
          {saving ? "SAVING..." : editingWorkoutId ? "UPDATE WORKOUT" : "SAVE WORKOUT"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run:
```bash
npx next build
```
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/parsed-workout-editor.tsx
git commit -m "feat: add parsed workout editor orchestrator component"
```

---

### Task 8: Workout Text Input Component

**Files:**
- Create: `src/components/workout-text-input.tsx`

- [ ] **Step 1: Create the text input component**

Create `src/components/workout-text-input.tsx`:

```typescript
"use client";

import { useState } from "react";
import { parseWorkoutText } from "@/app/actions";
import type { ClassType } from "@/db/schema";
import type { ParsedWorkout } from "@/lib/workout-parser";
import { ParsedWorkoutEditor } from "./parsed-workout-editor";
import { toast } from "sonner";

export function WorkoutTextInput() {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [classType, setClassType] = useState<ClassType>("CROSSFIT");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedWorkout | null>(null);

  async function handleParse() {
    if (!text.trim()) { toast.error("Enter a workout"); return; }

    setParsing(true);
    try {
      const result = await parseWorkoutText({ text: text.trim() });
      setParsed(result);
      if (!title.trim() && result.title) setTitle(result.title);
      if (result.classType) setClassType(result.classType);
    } catch (err) {
      toast.error("Failed to parse — check the text and try again");
      console.error(err);
    } finally {
      setParsing(false);
    }
  }

  if (parsed) {
    return (
      <ParsedWorkoutEditor
        classType={classType}
        title={title || parsed.title}
        date={date}
        sections={parsed.sections}
        onReparse={() => setParsed(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Date + Class Type */}
      <div className="flex gap-3">
        <div className="flex-1 bg-surface-container px-3 py-2">
          <span className="block text-[9px] font-bold uppercase tracking-widest text-outline">DATE</span>
          <input
            type="date"
            className="mt-1 w-full bg-transparent text-sm text-on-surface outline-none"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="bg-surface-container px-3 py-2">
          <span className="block text-[9px] font-bold uppercase tracking-widest text-outline">CLASS</span>
          <div className="mt-1 flex gap-1">
            {(["BARBELL", "CROSSFIT"] as const).map((ct) => (
              <button
                key={ct}
                onClick={() => setClassType(ct)}
                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                  classType === ct
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-highest text-outline"
                }`}
              >
                {ct}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="bg-surface-container px-3 py-2">
        <span className="block text-[9px] font-bold uppercase tracking-widest text-outline">TITLE</span>
        <input
          className="mt-1 w-full bg-transparent text-sm text-on-surface outline-none"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Monday CrossFit"
        />
      </div>

      {/* Text area */}
      <div className="bg-surface-container px-3 py-3">
        <span className="mb-2 block text-[9px] font-bold uppercase tracking-widest text-outline">
          PASTE OR TYPE YOUR WORKOUT
        </span>
        <textarea
          className="min-h-[200px] w-full resize-y bg-transparent font-mono text-sm leading-relaxed text-on-surface outline-none placeholder:text-outline/50"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Warm Up:\n3 rounds\n10 PVC pass throughs\n10 air squats\n200m jog\n\nStrength:\nBack Squat 5x5 @ 75%\n\nWOD:\nAMRAP 12 min\n5 Power Cleans (60/42.5kg)\n10 Box Jumps (24/20\")\n15 Wall Balls (9/6kg)"}
        />
      </div>

      {/* Parse button */}
      <button
        onClick={handleParse}
        disabled={parsing}
        className="squishy w-full bg-primary py-3.5 font-headline text-[11px] font-bold uppercase tracking-widest text-on-primary disabled:opacity-50"
      >
        {parsing ? "PARSING..." : "✨ PARSE WORKOUT"}
      </button>

      {/* Upload link */}
      <div className="text-center">
        <span className="text-xs text-outline">or </span>
        <a href="/admin/workouts/upload" className="text-xs text-primary underline">
          upload CSV/Excel
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run:
```bash
npx next build
```
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/workout-text-input.tsx
git commit -m "feat: add workout text input with AI parse button"
```

---

### Task 9: Admin Pages Overhaul

**Files:**
- Create: `src/app/(app)/admin/workouts/new/page.tsx`
- Modify: `src/app/(app)/admin/workouts/page.tsx`
- Modify: `src/components/admin-workouts-client.tsx`
- Modify: `src/app/(app)/admin/workouts/edit/[id]/page.tsx`

- [ ] **Step 1: Create the new workout page**

Create `src/app/(app)/admin/workouts/new/page.tsx`:

```typescript
import { WorkoutTextInput } from "@/components/workout-text-input";

export default function NewWorkoutPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-6">
      <h1 className="mb-6 font-headline text-xl font-black uppercase tracking-tight text-on-surface">
        ADD WORKOUT
      </h1>
      <WorkoutTextInput />
    </div>
  );
}
```

- [ ] **Step 2: Update the admin workouts client to show list with action buttons**

Replace the contents of `src/components/admin-workouts-client.tsx` with:

```typescript
"use client";

import Link from "next/link";
import { deleteWorkout } from "@/app/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Workout {
  id: number;
  date: string;
  title: string;
  classType: string;
}

export function AdminWorkoutsClient({
  upcoming,
  recent,
}: {
  upcoming: Workout[];
  recent: Workout[];
}) {
  const router = useRouter();

  async function handleDelete(id: number) {
    if (!confirm("Delete this workout?")) return;
    try {
      await deleteWorkout(id);
      toast.success("Deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete");
    }
  }

  function WorkoutRow({ workout }: { workout: Workout }) {
    return (
      <div className="flex items-center justify-between border-b border-surface-container-highest px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xs tabular-nums text-outline">
            {new Date(workout.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
          </span>
          <span className="text-sm font-bold text-on-surface">{workout.title}</span>
          <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest ${
            workout.classType === "CROSSFIT" ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-400"
          }`}>
            {workout.classType}
          </span>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/workouts/edit/${workout.id}`}
            className="text-[10px] font-bold uppercase tracking-widest text-primary"
          >
            EDIT
          </Link>
          <button
            onClick={() => handleDelete(workout.id)}
            className="text-[10px] font-bold uppercase tracking-widest text-error"
          >
            DEL
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Action buttons */}
      <div className="flex gap-3">
        <Link
          href="/admin/workouts/new"
          className="squishy flex-1 bg-primary py-3 text-center font-headline text-[11px] font-bold uppercase tracking-widest text-on-primary"
        >
          + NEW WORKOUT
        </Link>
        <Link
          href="/admin/workouts/upload"
          className="flex-1 border border-surface-container-highest py-3 text-center text-[11px] font-bold uppercase tracking-widest text-outline"
        >
          UPLOAD CSV
        </Link>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section>
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            UPCOMING
          </span>
          <div className="bg-surface-container">
            {upcoming.map((w) => <WorkoutRow key={w.id} workout={w} />)}
          </div>
        </section>
      )}

      {/* Recent */}
      {recent.length > 0 && (
        <section>
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            RECENT
          </span>
          <div className="bg-surface-container">
            {recent.map((w) => <WorkoutRow key={w.id} workout={w} />)}
          </div>
        </section>
      )}

      {upcoming.length === 0 && recent.length === 0 && (
        <div className="py-12 text-center text-xs text-outline">
          No workouts yet — create your first one!
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update the admin workouts page (server component)**

Replace the contents of `src/app/(app)/admin/workouts/page.tsx` with:

```typescript
import Link from "next/link";
import { getUpcomingWorkouts, getRecentWorkouts } from "@/app/actions";
import { AdminWorkoutsClient } from "@/components/admin-workouts-client";

export default async function AdminWorkoutsPage() {
  const [upcoming, recent] = await Promise.all([
    getUpcomingWorkouts(),
    getRecentWorkouts(),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-5 py-6">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/admin" className="text-sm text-primary">← Admin</Link>
        <h1 className="font-headline text-xl font-black uppercase tracking-tight text-on-surface">
          WORKOUTS
        </h1>
        <div className="w-12" />
      </div>
      <AdminWorkoutsClient upcoming={upcoming} recent={recent} />
    </div>
  );
}
```

**Note:** The existing `getUpcomingWorkouts` and `getRecentWorkouts` actions should already exist — they were used by the previous `admin-workouts-client.tsx`. If they don't exist by that exact name, check for equivalent functions (e.g. `getWorkoutsByDateRange`) and use those instead. The component just needs an array of `{ id, date, title, classType }`.

- [ ] **Step 4: Update the edit page to use the new editor**

Replace the contents of `src/app/(app)/admin/workouts/edit/[id]/page.tsx` with:

```typescript
import { getWorkoutById, getMovements } from "@/app/actions";
import { notFound } from "next/navigation";
import { ParsedWorkoutEditor } from "@/components/parsed-workout-editor";
import type { ParsedSection } from "@/lib/workout-parser";
import type { ClassType, WodFormat, WodScoreType, WodMovement, SectionExercise } from "@/db/schema";

export default async function EditWorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workout = await getWorkoutById(parseInt(id));
  if (!workout) return notFound();

  const sections: ParsedSection[] = workout.sections.map((s, i) => ({
    type: s.type,
    sortOrder: i,
    exercises: (s.exercises as SectionExercise[]) ?? [],
    sets: s.sets ?? undefined,
    liftName: s.liftName ?? undefined,
    wodFormat: (s.wodFormat as WodFormat) ?? undefined,
    wodScoreType: (s.wodScoreType as WodScoreType) ?? undefined,
    wodRounds: s.wodRounds ?? undefined,
    wodInterval: s.wodInterval ?? undefined,
    timeCap: s.timeCap ?? undefined,
    wodName: s.wodName ?? undefined,
    rxWeights: s.rxWeights ?? undefined,
    wodMovements: (s.wodMovements as WodMovement[]) ?? undefined,
    wodDescription: s.wodDescription ?? undefined,
  }));

  return (
    <div className="mx-auto max-w-2xl px-5 py-6">
      <ParsedWorkoutEditor
        classType={workout.classType as ClassType}
        title={workout.title}
        date={workout.date}
        sections={sections}
        editingWorkoutId={workout.id}
      />
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

Run:
```bash
npx next build
```
Expected: Build succeeds. All admin routes compile.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/admin/workouts/new/page.tsx src/app/\(app\)/admin/workouts/page.tsx src/components/admin-workouts-client.tsx src/app/\(app\)/admin/workouts/edit/\[id\]/page.tsx
git commit -m "feat: overhaul admin pages with AI-powered workout builder flow"
```

---

### Task 10: Bulk Upload Flow

**Files:**
- Create: `src/components/bulk-upload-flow.tsx`
- Create: `src/app/(app)/admin/workouts/upload/page.tsx`

- [ ] **Step 1: Install xlsx library**

Run:
```bash
npm install xlsx
```

- [ ] **Step 2: Create the bulk upload component**

Create `src/components/bulk-upload-flow.tsx`:

```typescript
"use client";

import { useState, useRef } from "react";
import { read, utils } from "xlsx";
import { parseWorkoutText, addWorkout } from "@/app/actions";
import type { ParsedWorkout } from "@/lib/workout-parser";
import { ParsedWorkoutEditor } from "./parsed-workout-editor";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface UploadedWorkout {
  text: string;
  date: string;
  parsed: ParsedWorkout | null;
  error: string | null;
  saved: boolean;
}

export function BulkUploadFlow() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [workouts, setWorkouts] = useState<UploadedWorkout[]>([]);
  const [parsing, setParsing] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const workbook = read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: string[][] = utils.sheet_to_json(sheet, { header: 1 });

    if (data.length === 0) { toast.error("Empty spreadsheet"); return; }

    // Detect layout: columns = workouts, rows = sections
    // First row = dates or headers
    const headerRow = data[0];
    const extracted: UploadedWorkout[] = [];

    for (let col = 0; col < headerRow.length; col++) {
      const dateStr = headerRow[col]?.toString().trim();
      if (!dateStr) continue;

      // Try to parse as date
      const parsedDate = parseSpreadsheetDate(dateStr);

      const cellTexts: string[] = [];
      for (let row = 1; row < data.length; row++) {
        const cell = data[row]?.[col]?.toString().trim();
        if (cell) cellTexts.push(cell);
      }

      if (cellTexts.length === 0) continue;

      extracted.push({
        text: cellTexts.join("\n\n"),
        date: parsedDate,
        parsed: null,
        error: null,
        saved: false,
      });
    }

    if (extracted.length === 0) { toast.error("No workouts found in file"); return; }

    setWorkouts(extracted);
    toast.success(`Found ${extracted.length} workouts`);

    // Parse all sequentially
    setParsing(true);
    for (let i = 0; i < extracted.length; i++) {
      try {
        const result = await parseWorkoutText({ text: extracted[i].text });
        extracted[i].parsed = result;
      } catch {
        extracted[i].error = "Failed to parse";
      }
      setWorkouts([...extracted]);
      setProgress(((i + 1) / extracted.length) * 100);
    }
    setParsing(false);
  }

  async function handleSaveAll() {
    const toSave = workouts.filter((w) => w.parsed && !w.saved);
    if (toSave.length === 0) { toast.error("Nothing to save"); return; }

    setSavingAll(true);
    let savedCount = 0;

    for (const w of workouts) {
      if (!w.parsed || w.saved) continue;
      try {
        await addWorkout({
          date: w.date,
          title: w.parsed.title,
          classType: w.parsed.classType,
          sections: w.parsed.sections.map((s) => ({
            type: s.type,
            sets: s.sets,
            liftName: s.liftName,
            exercises: s.exercises,
            wodScoreType: s.wodScoreType,
            timeCap: s.timeCap,
            wodName: s.wodName,
            rxWeights: s.rxWeights,
            wodFormat: s.wodFormat,
            wodRounds: s.wodRounds,
            wodInterval: s.wodInterval,
            wodDescription: s.wodDescription,
            wodMovements: s.wodMovements,
          })),
        });
        w.saved = true;
        savedCount++;
      } catch {
        w.error = "Failed to save";
      }
      setWorkouts([...workouts]);
    }

    setSavingAll(false);
    toast.success(`Saved ${savedCount} workouts`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {/* File input */}
      {workouts.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="text-center">
            <p className="font-headline text-lg font-bold text-on-surface">UPLOAD WORKOUTS</p>
            <p className="mt-1 text-xs text-outline">Upload a .xlsx or .csv file with workouts in columns</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFile}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="squishy bg-primary px-8 py-3 font-headline text-[11px] font-bold uppercase tracking-widest text-on-primary"
          >
            CHOOSE FILE
          </button>
        </div>
      )}

      {/* Progress */}
      {parsing && (
        <div>
          <div className="mb-1 text-xs text-outline">Parsing workouts... {Math.round(progress)}%</div>
          <div className="h-1 w-full bg-surface-container-highest">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Workout list */}
      {workouts.length > 0 && (
        <>
          {workouts.map((w, i) => (
            <div key={i} className="bg-surface-container">
              <button
                onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs tabular-nums text-outline">{w.date || "No date"}</span>
                  <span className="text-sm font-bold text-on-surface">
                    {w.parsed?.title || `Workout ${i + 1}`}
                  </span>
                  {w.parsed?.classType && (
                    <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest bg-primary/10 text-primary">
                      {w.parsed.classType}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {w.saved && <span className="text-[9px] font-bold text-primary">SAVED</span>}
                  {w.error && <span className="text-[9px] font-bold text-error">{w.error}</span>}
                  {!w.parsed && !w.error && <span className="text-[9px] text-outline">parsing...</span>}
                  <span className="material-symbols-outlined text-sm text-outline">
                    {expandedIdx === i ? "expand_less" : "expand_more"}
                  </span>
                </div>
              </button>

              {expandedIdx === i && w.parsed && (
                <div className="border-t border-surface-container-highest px-4 py-4">
                  <ParsedWorkoutEditor
                    classType={w.parsed.classType}
                    title={w.parsed.title}
                    date={w.date}
                    sections={w.parsed.sections}
                  />
                </div>
              )}
            </div>
          ))}

          {/* Save all */}
          {!parsing && workouts.some((w) => w.parsed && !w.saved) && (
            <button
              onClick={handleSaveAll}
              disabled={savingAll}
              className="squishy w-full bg-primary py-3.5 font-headline text-[11px] font-bold uppercase tracking-widest text-on-primary disabled:opacity-50"
            >
              {savingAll ? "SAVING..." : `SAVE ALL (${workouts.filter((w) => w.parsed && !w.saved).length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function parseSpreadsheetDate(value: string): string {
  // Try ISO format first
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  // Try common date formats
  const d = new Date(value);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];

  // Excel serial date number
  const serial = parseFloat(value);
  if (!isNaN(serial) && serial > 40000 && serial < 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + serial * 86400000);
    return date.toISOString().split("T")[0];
  }

  return new Date().toISOString().split("T")[0];
}
```

- [ ] **Step 3: Create the upload page**

Create `src/app/(app)/admin/workouts/upload/page.tsx`:

```typescript
import { BulkUploadFlow } from "@/components/bulk-upload-flow";

export default function UploadWorkoutsPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-6">
      <h1 className="mb-6 font-headline text-xl font-black uppercase tracking-tight text-on-surface">
        BULK UPLOAD
      </h1>
      <BulkUploadFlow />
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

Run:
```bash
npx next build
```
Expected: Build succeeds. Upload route appears in route table.

- [ ] **Step 5: Commit**

```bash
git add src/components/bulk-upload-flow.tsx src/app/\(app\)/admin/workouts/upload/page.tsx package.json package-lock.json
git commit -m "feat: add bulk workout upload from CSV/Excel"
```

---

### Task 11: Cleanup — Remove Old Builders

**Files:**
- Delete: `src/components/crossfit-builder.tsx`
- Delete: `src/components/section-builder.tsx`

- [ ] **Step 1: Check for remaining imports of old builders**

Run:
```bash
grep -r "crossfit-builder\|CrossFitBuilder\|section-builder\|SectionBuilder\|WorkoutBuilder\|workout-builder" src/ --include="*.tsx" --include="*.ts" -l
```

For each file found that still imports the old components, remove or replace the import. The admin workouts client and edit page were already updated in Task 9. If any other files reference them, remove those references.

- [ ] **Step 2: Delete old builder files**

Run:
```bash
rm src/components/crossfit-builder.tsx src/components/section-builder.tsx
```

Check if `workout-builder.tsx` exists and should also be removed:
```bash
ls src/components/workout-builder.tsx 2>/dev/null && rm src/components/workout-builder.tsx
```

- [ ] **Step 3: Verify build**

Run:
```bash
npx next build
```
Expected: Build succeeds with no references to deleted files.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old CrossFit and barbell builder components"
```

---

### Task 12: Final Build Verification and Testing

- [ ] **Step 1: Run full build**

Run:
```bash
npx next build
```
Expected: Clean build, all routes present including `/admin/workouts`, `/admin/workouts/new`, `/admin/workouts/upload`, `/admin/workouts/edit/[id]`.

- [ ] **Step 2: Start dev server and test**

Run:
```bash
npx next dev --turbopack
```

Test the following at http://localhost:3000 (logged in as admin):

1. Navigate to `/admin/workouts` — should show workout list with "NEW WORKOUT" and "UPLOAD CSV" buttons
2. Click "NEW WORKOUT" — should show text input with date, class type, title, and text area
3. Paste a workout and click "PARSE WORKOUT" — should show AI-parsed result with editable sections
4. Edit a field and click "SAVE WORKOUT" — should save and redirect to workout list
5. Click "EDIT" on a workout — should load into the parsed editor
6. Navigate to `/admin/workouts/upload` — should show file upload UI

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address issues found during testing"
```
