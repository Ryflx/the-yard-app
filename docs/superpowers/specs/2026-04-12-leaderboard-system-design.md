# Leaderboard System — Design Spec

**Date:** 2026-04-12
**Status:** Draft
**Mockups:** `.superpowers/brainstorm/50173-1776020538/content/`

## Overview

Redesign the leaderboard system from a simple 1RM ranking page into a two-tab (Barbell + CrossFit) leaderboard with three interconnected surfaces:

1. **Inline WOD leaderboard** — embedded in the workout detail page after logging a score
2. **CrossFit leaderboard tab** — tier-based rankings on the main leaderboard page
3. **Per-WOD drill-down** — full leaderboard for a specific benchmark WOD

The Barbell tab retains the existing 1RM-per-lift rankings. The CrossFit tab is entirely new.

## Data Model Changes

### 1. `wodResults.rx` → `wodResults.rxLevel` enum

Replace the boolean `rx` field with a three-tier enum:

```
"SCALED" | "RX" | "RX_PLUS"
```

**Migration:** Existing rows with `rx = true` → `"RX"`, `rx = false` → `"SCALED"`. Drop the `rx` column after migration.

### 2. New field: `wodResults.public`

```
public: boolean, default true
```

Controls per-score visibility on leaderboards. A score appears on the leaderboard only if **both** the user's `leaderboardOptIn` is true **and** the score's `public` is true.

### 3. Schema summary

```
wodResults {
  id: serial PK
  userId: text
  workoutId: integer FK → workouts
  sectionId: integer FK → workoutSections
  scoreType: WodScoreType
  scoreValue: text
  rxLevel: "SCALED" | "RX" | "RX_PLUS"   ← was: rx boolean
  public: boolean, default true            ← new
  notes: text
  createdAt: timestamp
}
```

No changes to other tables.

## Surface 1: Inline WOD Leaderboard (Workout Page)

### Location

Appears inside the WOD section on `/workout/[date]`, directly below the score entry component, **after** the user has logged a score.

### Behaviour

- Shows top 5 scores + the current user's position (if outside top 5, show a "..." gap then their row)
- Defaults to the tier (Scaled/RX/RX+) the user just logged at
- Three-tab filter: Scaled / RX / RX+ — switches the leaderboard to that tier
- Only shows public scores from opted-in users
- Current user's row highlighted with green background and "You" label
- Podium-style ranking numbers: gold (1st), silver (2nd), bronze (3rd)
- "VIEW FULL LEADERBOARD →" link at the bottom navigates to the per-WOD drill-down (Surface 3)
- If no other scores exist yet, show the user's score with a "First one here!" message

### Data requirements

- Server action: `getWodLeaderboard(sectionId, rxLevel)` — returns ranked scores filtered by tier
- Sorting must be **semantic**, not string-based:
  - TIME/INTERVAL: lower is better (parse "MM:SS" to seconds)
  - ROUNDS_REPS: higher is better (parse "R+Reps" — compare rounds first, then reps as tiebreaker)
  - LOAD/CALS/DISTANCE: higher is better (parse as number)
- Returns: `{ entries: { userId, displayName, scoreValue, rxLevel, position }[], currentUserId, userPosition }`

## Surface 2: CrossFit Leaderboard Tab (Leaderboard Page)

### Location

New "CROSSFIT" tab on `/leaderboard`, alongside the existing "BARBELL" tab.

### Layout (top to bottom)

1. **BARBELL / CROSSFIT tab bar** — at the top of the page
2. **Scaled / RX / RX+ filter tabs** — filters all content below
3. **Your Tier Ladder** — personal tier progression visualisation (see Tier Ladder section)
4. **Tier Rankings** — podium (top 3) + full ranked list of all users
5. **Browse Benchmark WODs** — grid of WOD cards linking to per-WOD drill-down

### Tier Ladder (personal card)

Vertical progression visualisation showing all five tiers as rungs on a ladder:

- DRAGON (top) — 850+ pts
- BEAST — 600+ pts
- WARRIOR — 350+ pts
- HUNTER — 150+ pts
- ROOKIE (bottom) — 0+ pts

The current user's position is marked between the appropriate tiers with their score and "X pts to [NEXT TIER]" message. Uses a vertical line with coloured dots at each tier level, and a larger green "YOU" marker at the user's position.

### Composite Scoring

Each user's overall CrossFit score is calculated from their best benchmark WOD performances:

| Tier | Points per WOD |
|------|---------------|
| DRAGON | 100 |
| BEAST | 70 |
| WARRIOR | 40 |
| HUNTER | 20 |
| ROOKIE | 5 |

**Formula:** `score = (sum of points from all attempted benchmark WODs / max possible points) × 1000`

Where max possible = number of WODs attempted × 100 (DRAGON on every WOD).

**Minimum qualification:** 3 benchmark WODs attempted to appear on the leaderboard.

**Multiple attempts:** If a user logs the same benchmark WOD multiple times, use their best score. If they log at different rxLevels (e.g., Scaled and RX), each level tracks independently — the Scaled leaderboard uses their best Scaled score, the RX leaderboard uses their best RX score.

**Tier thresholds for the user's overall tier:**
- DRAGON: 850+
- BEAST: 600+
- WARRIOR: 350+
- HUNTER: 150+
- ROOKIE: 0+

### Rankings list

- Podium cards for top 3 (1st centre/tallest, 2nd left, 3rd right)
- Each podium card shows: name, tier badge counts (coloured pills with emoji + count), composite score
- Full list below with: position, name, coloured dots representing tier distribution, composite score
- Current user highlighted in green

### Browse Benchmark WODs

Grid of cards (2 columns) showing all 26 benchmark WODs:
- WOD name, short description, score type
- User's best tier badge (or "Not attempted")
- Tapping a card navigates to Surface 3

### Data requirements

New server action: `getCrossfitLeaderboardData(rxLevel)` returning:
```typescript
{
  rankings: {
    userId: string;
    displayName: string;
    compositeScore: number;
    overallTier: string;
    tierCounts: Record<string, number>; // e.g. { DRAGON: 2, BEAST: 3, WARRIOR: 1 }
    wodsAttempted: number;
  }[];
  currentUser: {
    userId: string;
    compositeScore: number;
    overallTier: string;
    tierCounts: Record<string, number>;
    pointsToNextTier: number;
    nextTier: string;
  } | null;
  benchmarkWods: {
    name: string;
    description: string;
    scoreType: WodScoreType;
    userBestTier: string | null;
  }[];
}
```

## Surface 3: Per-WOD Drill-Down

### Location

Dedicated page at `/leaderboard/wod/[wodName]` (or modal — page preferred for shareability).

### Layout (top to bottom)

1. **Back navigation** — "← Fran" with WOD description
2. **Your Best Score card** — score, date, rxLevel badge, tier badge with percentile, mini progress bar showing distance to next tier (contextual: "1:12 faster to DRAGON" for TIME, "5 more reps to BEAST" for ROUNDS_REPS)
3. **Scaled / RX / RX+ filter tabs**
4. **All Scores list** — full ranked list with position, name, tier badge, score

### Tier context per score type

- **TIME / INTERVAL:** "X:XX faster to reach [NEXT TIER]"
- **ROUNDS_REPS:** "X more rounds+reps to reach [NEXT TIER]"
- **LOAD / CALS / DISTANCE:** "X more [unit] to reach [NEXT TIER]"

### Data requirements

New server action: `getWodDrilldown(wodName, rxLevel)` returning:
```typescript
{
  wod: { name: string; description: string; scoreType: WodScoreType };
  userBest: {
    scoreValue: string;
    rxLevel: string;
    tier: string;
    percentile: string;
    date: string;
    distanceToNextTier: string; // human-readable, e.g. "1:12 faster"
    nextTier: string | null;
  } | null;
  entries: {
    userId: string;
    displayName: string;
    scoreValue: string;
    tier: string;
    position: number;
  }[];
  currentUserId: string | null;
}
```

## Score Entry Changes

### Updated WOD Score Entry component

Modifications to `wod-score-entry.tsx`:

1. **Replace RX checkbox with three-way toggle:** Scaled / RX / RX+ segmented control (same style as leaderboard filter tabs)
2. **Add public/private toggle:** Eye icon next to the notes field, defaulting to public (eye open). Tapping toggles to private (eye closed). Stored as `wodResults.public`.
3. **After logging:** Show the inline leaderboard (Surface 1) below the "Score logged!" confirmation

### Updated `logWodResult` server action

```typescript
logWodResult(data: {
  workoutId: number;
  sectionId: number;
  scoreType: WodScoreType;
  scoreValue: string;
  rxLevel: "SCALED" | "RX" | "RX_PLUS";  // was: rx boolean
  public: boolean;                         // new, default true
  notes?: string;
})
```

## Sorting Logic (Bug Fix)

The existing `getWodLeaderboard` sorts by string value which is incorrect. Implement semantic sorting:

```typescript
function compareWodScores(a: string, b: string, scoreType: WodScoreType): number {
  if (scoreType === "TIME" || scoreType === "INTERVAL") {
    // Parse "MM:SS" to seconds, lower is better
    return parseTimeToSeconds(a) - parseTimeToSeconds(b);
  }
  if (scoreType === "ROUNDS_REPS") {
    // Parse "R+Reps", higher is better
    return parseRoundsReps(b) - parseRoundsReps(a);
  }
  // LOAD, CALS, DISTANCE — higher is better
  return parseFloat(b) - parseFloat(a);
}
```

## Routing

| Route | Surface |
|-------|---------|
| `/leaderboard` (BARBELL tab) | Existing 1RM rankings (unchanged) |
| `/leaderboard` (CROSSFIT tab) | Surface 2: tier rankings + browse WODs |
| `/leaderboard/wod/[wodName]` | Surface 3: per-WOD drill-down |
| `/workout/[date]` (WOD section) | Surface 1: inline leaderboard after logging |

## Non-functional Considerations

- **Privacy:** Score visibility = `leaderboardOptIn AND score.public`. Both must be true.
- **Performance:** Leaderboard queries should be efficient — consider indexing `wodResults` on `(sectionId, rxLevel, public)` and `(userId, sectionId)`.
- **Empty states:** Handle gracefully — "No scores yet" for WODs with no entries, "Be the first!" when no one has logged at a tier.
- **Benchmark vs non-benchmark:** The tier system (DRAGON/BEAST/etc.) and the CrossFit leaderboard tab (Surface 2) only apply to the 26 defined benchmark WODs. Non-benchmark WOD scores still get the inline leaderboard (Surface 1) — ranked by score with Scaled/RX/RX+ filter, but no tier badges. The inline leaderboard is keyed by `sectionId`, so it works for any WOD section regardless of whether it's a benchmark.
