# AI-Powered Workout Builder — Design Spec

**Date:** 2026-04-12
**Status:** Draft
**Mockups:** `.superpowers/brainstorm/62415-1776027196/content/`

## Overview

Replace both the `CrossFitBuilder` and `WorkoutBuilder` components with a single AI-powered workflow: coach types or pastes a workout in plain text, the AI parses it into structured data, and the coach reviews/edits an inline preview before saving. Supports both CrossFit and Barbell class types. Bulk upload via CSV/Excel uses the same parser per-workout.

## Architecture: AI-First with Smart Fallback

The structured builder is never a blank form. The coach always starts by typing or pasting text (or uploading a file). The AI parses it into structured sections, and the result is shown as an inline-editable preview. The "editor" is the "builder" — pre-populated, never empty.

### Flow

```
Text Input → AI Parse → Inline Editor (review/edit) → Save
```

### Why This Approach

- CrossFit workouts are inherently freeform — EMOMs, 21-15-9 schemes, Death By, alternating minutes. A dropdown-based form cannot cover all formats without becoming unusably complex.
- Coaches already think in plain text (whiteboards, spreadsheets, group chats).
- Mobile stays clean — one text box, not 15 dropdowns.
- Structured data still gets extracted for scoring, leaderboards, and movement tracking.
- One unified flow for both Barbell and CrossFit, replacing two separate builder components.

## Data Model Changes

### New columns on `workoutSections`

| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| `wodFormat` | text | yes | null | Workout format enum (see below) |
| `wodRounds` | integer | yes | null | Round count (5 for "5RFT", 16 for "EMOM 16") |
| `wodInterval` | integer | yes | null | Interval in seconds (60 for EMOM, 20 for Tabata) |
| `wodDescription` | text | yes | null | Raw coach text — preserved for display |
| `wodMovements` | jsonb | yes | null | Structured movement array for WOD sections |

### `WodFormat` enum values

```
"FOR_TIME" | "ROUNDS_FOR_TIME" | "AMRAP" | "EMOM" | "DEATH_BY" | "INTERVAL" | "TABATA" | "MAX_LOAD"
```

### `WodMovement` interface (stored in `wodMovements` jsonb)

```typescript
interface WodMovement {
  name: string;           // normalised movement name, e.g. "Power Clean"
  reps: string;           // "5", "12", "800m", "21-15-9" — string for flexibility
  weight: string | null;  // "60/42.5kg", "24/20\"", "53/35lb"
  unit: string | null;    // "kg", "lb", "cal", "m"
  note: string | null;    // "Odd minutes", "ascending", etc.
}
```

### Extended `SectionExercise` interface (existing `exercises` jsonb)

Used for non-WOD sections (warm up, strength, skill, accessory, on ramp):

```typescript
interface SectionExercise {
  name: string;
  reps?: string;                    // "10", "5x5", "3 rounds" — new
  weight?: string;                  // "@ 75%", "32kg" — new
  percentageSets?: PercentageSet[]; // existing, for barbell percentage work
}
```

### Unchanged fields

- `wodScoreType` — unchanged (TIME, ROUNDS_REPS, LOAD, CALS, DISTANCE, INTERVAL)
- `timeCap` — unchanged (integer, seconds)
- `wodName` — unchanged (benchmark WOD name, nullable)
- `rxWeights` — unchanged (summary string, nullable)

### Format → Default Score Type Mapping

The AI infers score type from format, but the coach can override:

| Format | Default Score Type |
|--------|-------------------|
| FOR_TIME | TIME |
| ROUNDS_FOR_TIME | TIME |
| AMRAP | ROUNDS_REPS |
| EMOM | ROUNDS_REPS |
| DEATH_BY | ROUNDS_REPS |
| INTERVAL | INTERVAL |
| TABATA | ROUNDS_REPS |
| MAX_LOAD | LOAD |

## AI Parser

### Server action: `parseWorkoutText`

```typescript
"use server"

async function parseWorkoutText(input: {
  text: string;
  date?: string;
}): Promise<ParsedWorkout>
```

Calls `claude-haiku-4-5` via the Anthropic SDK with a structured system prompt. Returns:

```typescript
interface ParsedWorkout {
  classType: "BARBELL" | "CROSSFIT";
  title: string;
  sections: ParsedSection[];
}

interface ParsedSection {
  type: WorkoutSectionType;     // "WARM UP", "STRENGTH", "WOD", "SKILL", etc.
  sortOrder: number;

  // For non-WOD sections:
  exercises: SectionExercise[];
  sets?: string;                // "5x5", "3 sets", etc.

  // For WOD sections:
  wodFormat?: WodFormat;
  wodScoreType?: WodScoreType;
  wodRounds?: number;
  wodInterval?: number;
  timeCap?: number;             // seconds
  wodName?: string;             // "Fran", "Cindy", etc. if recognised
  rxWeights?: string;
  wodMovements?: WodMovement[];
  wodDescription?: string;      // raw text for this section
}
```

### AI Prompt Design

The system prompt instructs the model to:

1. **Detect class type** — barbell (percentage-based Olympic lifts, strength focus) vs CrossFit (WOD, AMRAP, EMOM, etc.)
2. **Split into sections** — identify Warm Up, Primer, Strength, Skill, WOD, On Ramp, Cool Down, etc. from the text structure
3. **Parse WOD format** — identify the format type and extract rounds, interval, time cap
4. **Extract movements** — normalise names to the canonical list from the `movements` database table, extract reps, weights, units. The full movement list is included in the system prompt so the AI maps abbreviations to exact DB names.
5. **Recognise benchmarks** — if the text mentions "Fran", "Cindy", etc., set `wodName` and fill in standard movements if not provided
6. **Infer score type** — based on format (AMRAP → ROUNDS_REPS, For Time → TIME, etc.)
7. **Parse barbell percentage work** — "3@70%, 2@80%, 1@90%" → `percentageSets` array
8. **Return valid JSON** — use tool_use / structured output to guarantee schema compliance

### Movement Normalisation

The AI normalises movement names to match the existing movement database. Examples:
- "Cal Row" → "Calorie Row"
- "C2B" → "Chest-to-Bar Pull-up"
- "T2B" → "Toes-to-Bar"
- "HSPU" → "Handstand Push-up"
- "DU" → "Double-Under"
- "MU" → "Muscle-Up"
- "PC" → "Power Clean"
- "S2OH" / "STO" → "Shoulder-to-Overhead"

The system prompt includes the full movement list from the database so the AI maps to exact canonical names.

### Error Handling

- If the AI can't parse the text, return a best-effort result with `wodDescription` set to the raw text and empty structured fields — the coach can fill in the editor manually.
- If the API call fails (network, rate limit), show an error toast and let the coach retry.
- Rate limit: one parse request at a time, debounce on the button.

## UI: Single Workout Flow

### Step 1: Input Screen

**Route:** `/admin/workouts` (replaces current page)

**Layout:**
- Date picker + Class Type toggle (Barbell / CrossFit) at the top — these are hints for the AI but not required; the AI auto-detects class type from content
- Title field
- Large text area: "PASTE OR TYPE YOUR WORKOUT"
- "PARSE WORKOUT" button (primary CTA)
- "Upload CSV/Excel" secondary link

**Mobile:** Full-width stacked layout. Text area is the hero.
**Desktop:** Metadata (date, class, title) in a left sidebar, text area takes remaining width. Upload buttons in the header.

### Step 2: Review & Edit Screen

**Shown after AI parsing returns.**

**Header:** Back button, title, date, "AI Parsed" badge

**Sections rendered in order (Warm Up → Strength/Skill → WOD → On Ramp/Cool Down):**

Each section shows:
- **Section type badge** (colour-coded: WOD = red, Strength = blue, Warm Up = grey)
- **For non-WOD sections:** Exercise list with reps and weights, "edit" button per exercise, "+ Add exercise" at bottom
- **For WOD sections:**
  - Format dropdown (FOR_TIME, AMRAP, EMOM, etc.) — pre-filled by AI
  - Score type dropdown — pre-filled, overridable
  - Time cap field (MM:SS)
  - Rounds field (if applicable)
  - Interval field (if EMOM/Tabata/Interval)
  - WOD name field (if benchmark)
  - RX weights field
  - Movement list: each row shows reps, name, weight — all inline-editable
  - "+ Add movement" button
- **"edit" links** on each field — tapping opens inline editing (no modal, no separate page)

**Footer:**
- "RE-PARSE" button — goes back to Step 1 with text preserved
- "SAVE WORKOUT" button (primary CTA)

### Editing Behaviour

- **Inline editing:** Tapping "edit" on any field makes it editable in-place. No modals.
- **Movement picker:** When editing a movement name, the existing autocomplete picker appears.
- **Add/remove:** Coach can add or remove movements, add or remove entire sections.
- **Section reorder:** Drag-to-reorder or up/down arrows on sections.

## UI: Bulk Upload Flow

### Step 1: Upload

Coach uploads `.xlsx` or `.csv` file from the admin page ("Upload CSV/Excel" link).

### Step 2: Column Detection

The system reads the file and detects the layout:
- Each column = one workout/day
- First row = date (or column header with date)
- Subsequent rows = sections of the workout, going down

Each column's cells are concatenated into a single text block per workout, then sent to the AI parser.

### Step 3: Review List

Shows a scrollable list of parsed workout cards:
- Each card shows: date, title, class type, format badge, section count
- **Collapsed by default** — shows one-line summary
- **Tap to expand** — shows the full inline editor (same as single workout Step 2)
- Cards with parse issues are highlighted (missing date, unrecognised format)

### Step 4: Save

- "SAVE ALL" button saves every workout
- Or save individually per card
- Progress indicator during bulk save

### File Parsing

Use a client-side library (`xlsx` / `SheetJS`) to read the spreadsheet into a 2D array, then:
1. Detect date row (first row or column headers)
2. Group cells by column
3. Concatenate non-empty cells per column into text blocks
4. Send each block to `parseWorkoutText`

## Components to Create/Modify

### New Components

| Component | Purpose |
|-----------|---------|
| `WorkoutTextInput` | Text area + date/class/title fields + parse button |
| `ParsedWorkoutEditor` | Inline editor for a parsed workout — sections, movements, metadata |
| `WodSectionEditor` | Editable WOD section — format, score type, movements, time cap |
| `SectionEditor` | Editable non-WOD section — exercises with reps/weights |
| `BulkUploadFlow` | File upload → parse → review list → bulk save |
| `ParsedWorkoutCard` | Collapsible card in bulk upload list |

### Modified Components

| Component | Change |
|-----------|--------|
| `AdminWorkoutsClient` | Replace builder toggle with unified text input flow |
| `admin/workouts/page.tsx` | Simplified — just renders `AdminWorkoutsClient` |
| `admin/workouts/edit/[id]/page.tsx` | Load existing workout into `ParsedWorkoutEditor` |

### Removed Components

| Component | Reason |
|-----------|--------|
| `CrossFitBuilder` | Replaced by AI-powered flow |
| `WorkoutBuilder` (barbell) | Replaced by AI-powered flow |
| `SectionBuilder` | Replaced by `SectionEditor` |

## Server Actions

### New

```typescript
// AI parser — calls Claude API, returns structured workout
parseWorkoutText(input: { text: string; date?: string }): Promise<ParsedWorkout>

// Bulk parse — parses multiple workouts from uploaded file data
parseWorkoutBulk(workouts: { text: string; date?: string }[]): Promise<ParsedWorkout[]>
```

### Modified

```typescript
// addWorkout — accepts ParsedWorkout shape instead of the old builder format
addWorkout(data: {
  date: string;
  classType: ClassType;
  title: string;
  sections: ParsedSection[];
}): Promise<{ id: number }>

// updateWorkout — same new shape
updateWorkout(id: number, data: {
  date: string;
  classType: ClassType;
  title: string;
  sections: ParsedSection[];
}): Promise<void>
```

## API Key Configuration

The AI parser requires an Anthropic API key. Options:

1. **Environment variable:** `ANTHROPIC_API_KEY` in `.env.local` and Vercel env vars
2. **Model:** `claude-haiku-4-5` — fast and cheap, sufficient for workout text parsing
3. **Cost estimate:** ~$0.001 per parse (small input, structured output). Bulk upload of 30 workouts ≈ $0.03.

## Routing

| Route | What |
|-------|------|
| `/admin/workouts` | Workout list + "Add Workout" button |
| `/admin/workouts/new` | Text input → parse → edit → save flow |
| `/admin/workouts/edit/[id]` | Load existing workout into parsed editor |
| `/admin/workouts/upload` | Bulk upload flow |

## Non-functional Considerations

- **Latency:** Haiku parse should return in < 2 seconds. Show a loading spinner with "Parsing..." during the AI call.
- **Offline:** The text input works offline (it's just a textarea). The parse button requires network. Show a clear error if offline.
- **Permissions:** Only admin users (coach role via Clerk) can access `/admin/*` routes. Unchanged from current.
- **Cost control:** Rate limit parse requests — one at a time, no parallel calls from the same user. For bulk, process sequentially with a progress bar.
- **Backwards compatibility:** Existing workouts in the database are unaffected. New columns are all nullable. The edit page loads old workouts into the new editor by mapping existing fields to the `ParsedSection` shape.
- **Class types:** Only `BARBELL` and `CROSSFIT` are supported by the new builder. `ENGINES` and `OTHER` class types exist in the schema but remain unsupported (no change from current state).
