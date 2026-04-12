# The Yard Peckham — App Specification

> Living document. Updated every time features are added or changed.
> Last updated: **10 April 2026**

---

## Overview

A full-featured gym companion app built for **The Yard Peckham**. Supports multiple class types (Barbell, CrossFit), workout programming, performance tracking, strength standards, benchmark WOD tiers, leaderboards, goal setting, and coach administration — all in a mobile-first PWA.

**Tech stack:** Next.js 16 (App Router), Drizzle ORM, Neon Postgres, Clerk Auth, Tailwind CSS, Vercel hosting.

---

## 1. Authentication & Access Control

- **Clerk-powered sign-in/sign-up** with themed UI matching the app's dark aesthetic.
- **Role-based access**: Members and Admins (coaches).
- **First-admin bootstrap**: When no admin exists in the database, the first user to claim admin gets it — no manual DB intervention needed.
- **Admin-only routes**: `/admin/*` redirects non-admins to the dashboard.
- **Protected routes**: Everything except landing, sign-in, sign-up, and offline pages requires authentication.

---

## 2. Dashboard / Schedule

- **Weekly view** with Monday-start weeks and 5-day (Mon–Fri) layout.
- **Class type tabs**: Switch between **Barbell** and **CrossFit** views. Each shows only workouts of that type.
- **Day selector**: Tap any day to see the programmed workout.
- **Personalised summary chips** (Barbell): Shows your current 1RM, last Olympic log weight, and recent strength weights for the selected day's workout — up to 4 chips.
- **CrossFit workout cards**: Display WOD name, score type badge (FOR TIME / AMRAP / INTERVAL), time cap, and RX weights at a glance.
- **Streak tracking**: Weekly streak (consecutive weeks with at least one session), sessions this month, total session days, and longest streak — calculated from both lift logs and WOD results.
- **Empty states**: Clean "no workout programmed" message when nothing is scheduled.
- **Quick links** to leaderboard and workout detail pages.

---

## 3. Workout Detail — Barbell

- **1RM display**: Shows your stored max for the day's Olympic lift. Tap to update.
- **Estimated 1RM banner**: If your stored max is stale (>4 weeks) or missing, the app calculates an estimated 1RM from your last 12 weeks of logs (reps ≤ 10) and suggests you update it.
- **Percentage-based programming**: Each prescribed set shows the % and the calculated weight in kg based on your 1RM.
- **Plate calculator**: Toggle per-set to see the exact plates needed on each side of the bar (supports 20kg and 15kg bars, plates from 25kg down to 0.5kg).
- **Warm-up calculator**: Auto-generates warm-up sets ramping up to your working weight.
- **One-tap logging**: Log each set at the prescribed weight, or tap and hold for custom weight/reps entry.
- **Inline strength/accessory logging**: For non-Olympic sections (STRENGTH 1–3, ACCESSORY), log weight and reps inline.
- **PR detection**: Automatically detects when a logged weight is a new personal best. Updates your 1RM if it was a single rep.
- **PR celebration overlay**: Full-screen animation showing the new record, weight, lift name, and improvement delta.
- **Rest timer**: Floating timer that auto-starts after logging a set. Duration varies by section type (Olympic: 3 min, Strength: 2 min, Accessory: 1 min).
- **Exercise history**: See your last 10 logged entries for each exercise in the workout.
- **Previous weight indicators**: Each exercise shows what you lifted last time with a delta indicator.

---

## 4. Workout Detail — CrossFit

- **Section-based layout**: Warm Up, Strength/Skill/Heavy Day/Loading Up, WOD, and On Ramp sections each with distinct styling.
- **WOD card**: Displays the workout description, movements, RX weights, and time cap.
- **WOD score logging**: Supports multiple score types:
  - **TIME**: Enter minutes and seconds (for "For Time" WODs).
  - **ROUNDS_REPS**: Enter rounds + extra reps (for AMRAPs).
  - **INTERVAL**: Time-based interval scoring.
  - **LOAD / CALS / DISTANCE**: Free-form entry.
- **RX toggle**: When RX weights are specified, toggle whether you completed the workout as prescribed.
- **Strength logging in CrossFit**: Strength/Heavy Day/Loading Up sections use the same inline logging as Barbell, writing to the same lift log history.
- **Benchmark WOD tier classification**: When you log a score for a recognised benchmark WOD (see §10), you immediately see your tier (DRAGON → ROOKIE) with a percentile label.
- **On Ramp display**: Scaled workout variant shown with yellow badge.

---

## 5. Progress & Stats

- **Monthly recap card**:
  - Total sessions this month.
  - Total volume lifted (kg).
  - PRs hit this month.
  - Heaviest single lift of the month.
  - Comparison vs last month's session count (up/down indicator).
- **Lift progress charts**: Per-lift time series SVG charts showing weight over time (requires 2+ data points).
- **Personal record cards**: Grid of all tracked lifts with current 1RM, date last updated, and tap-to-edit.
- **Recent performance list**: Last 100 logged lifts with date, lift name, weight, reps, and sets.

---

## 6. Strength Standards

### Olympic Lifts (Catalyst Athletics 2018)

- **7 levels**: Beginner → Intermediate → Advanced → National → Elite → Exceptional → World Class.
- **Lifts assessed**: Snatch, Clean & Jerk, Back Squat, Front Squat.
- **Bodyweight-class interpolation**: Standards adjust to the nearest weight class for the user's bodyweight and sex.
- **Per-lift gauge**: Visual level bar showing current level, progress within the level, and the kg target for the next level.
- **Alias mapping**: Programmed lift names (e.g. "squat snatch", "power clean + jerk") automatically map to standard lifts.

### General Strength (Bodyweight Multiplier Standards)

- **5 levels**: Beginner → Novice → Intermediate → Advanced → Elite.
- **Lifts assessed**: Bench Press, Deadlift.
- **Aliases**: Swiss bar bench press → Bench Press. Sumo/hybrid/conventional deadlift → Deadlift.
- **Standards**: Based on normative data from 809,986 drug-tested powerlifting competition entries.
- **Same gauge UI** as Olympic lifts with level bar and next target.

### Combined Strength Score

- **0–1000 scale** combining Olympic and general lift assessments, weighted by number of lifts tracked.
- Displayed at the top of the strength dashboard.

---

## 7. Goal Setting

- **Create goals**: Pick a lift, set a target weight (kg), optionally set a target date.
- **Auto-completion**: When you log a PR that meets or exceeds a goal's target weight, the goal is automatically marked as completed.
- **Progress tracking**: Each active goal shows a progress bar based on your current max vs the target.
- **Active/completed split**: Goals are organised into active and completed lists.
- **Delete**: Remove goals you no longer want.

---

## 8. Leaderboard

- **Opt-in system**: Users choose whether to appear on the leaderboard from their profile.
- **Per-lift 1RM rankings**: Groups all opted-in users by lift, sorted by heaviest weight.
- **Podium styling**: Gold/silver/bronze backgrounds for top 3.
- **Current user highlight**: Your entries are highlighted with a "YOU" badge.
- **All class types**: Rankings include maxes from both Barbell and CrossFit strength work.
- **WOD leaderboard** (server action ready): `getWodLeaderboard` exists and returns per-section scores — UI integration available for future use.

---

## 9. Profile

- **Display name**: How you appear on leaderboards and to coaches.
- **Bodyweight (kg)**: Used for strength standard calculations.
- **Sex (male/female)**: Used for sex-specific strength standards and WOD benchmark brackets.
- **Leaderboard opt-in toggle**.
- **Sign out** via Clerk.

---

## 10. Benchmark WOD Percentile / Tier System

When a user logs a score for a recognised benchmark WOD, the app classifies their performance into one of **5 tiers**:

| Tier | Icon | Colour | Approx. Percentile |
|------|------|--------|---------------------|
| **DRAGON** | 🔥 | Red | Top 2% |
| **BEAST** | 🐾 | Lime green | Top 16% |
| **WARRIOR** | 🛡️ | Off-white | Top 50% |
| **HUNTER** | 🎯 | Grey | Top 84% |
| **ROOKIE** | 🥾 | Dark grey | Getting started |

### Supported Benchmark WODs (26 total)

**Girl WODs (18):**
Fran, Grace, Helen, Diane, Cindy, Jackie, Isabel, Karen, Elizabeth, Nancy, Annie, Angie, Barbara, Kelly, Mary, Amanda, Eva, Nicole.

**Hero WODs (8):**
Murph, Nate, DT, Randy, Badger, Josh, Loredo, Luce, Michael, RJ, The Seven.

- Brackets are **sex-differentiated** (male/female) where the data supports it.
- Sources: BTWB normative data, EVOX standards, Springer Open research (n=10,000+).
- **Extensible**: Adding a new benchmark is a single data entry in the config file.

---

## 11. Coach / Admin Interface

### Workout Programming

- **Barbell builder**: Fixed section structure (Warm Up, Primer, Olympic Lift, Strength 1–3, Accessory, Cool Down). Per-section: set scheme, exercises with optional percentage programming.
- **CrossFit builder**: Flexible sections — add any combination of Warm Up, Strength, Skill, Heavy Day, Loading Up, WOD, On Ramp. WOD sections have additional config: score type, time cap, WOD name (for benchmark matching), RX weights.
- **Movement library**: Searchable movement picker with category filtering. Coaches can add new movements on the fly.
- **Edit existing workouts**: Full edit capability for any programmed workout.
- **Delete workouts**: Remove workouts from the schedule.
- **Upcoming & recent lists**: See the next 20 upcoming and last 10 past workouts at a glance.

### User Management

- **User list**: Shows all gym members (up to 100 from Clerk) merged with app profile data.
- **Role management**: Promote members to admin or demote admins to member.
- **Last-admin protection**: Cannot remove admin role from the last remaining admin.

---

## 12. Movement Library

- **99 pre-seeded movements** across categories:
  - **Olympic**: Snatch variants, clean variants, jerk variants.
  - **Strength**: Squat variants, bench press, deadlift, press, rows.
  - **Accessory**: RDLs, lunges, curls, extensions, carries.
  - **Warm Up**: Mobility, stretches, activation drills.
  - **Conditioning**: Running, rowing, biking, ski erg, burpees.
  - **Gymnastics**: Pull-ups, toes to bar, muscle-ups, handstand push-ups, rope climbs, box jumps.
- **Admin-extensible**: Coaches can create new movements from the workout builder.

---

## 13. PWA / Mobile Experience

- **Installable**: Full PWA manifest — installs as "The Yard Peckham" with standalone display and dark theme.
- **Offline fallback**: Service worker serves an offline page when the network is unavailable.
- **Auto-update**: Service worker checks for updates every 60 seconds and reloads when a new version is available.
- **Mobile-first design**: Bottom navigation, touch-optimised buttons (squishy press animations), full-width cards.
- **Portrait orientation** optimised.

---

## 14. Data Architecture

### Class Types Supported
- **BARBELL**: Traditional weightlifting programming with percentage-based work.
- **CROSSFIT**: WOD-based programming with warm-ups, strength, WODs, and scaled variants.
- **ENGINES** and **OTHER**: Schema-ready for future class types.

### Multiple Workouts Per Day
- The system supports multiple workouts on the same date (e.g. a Barbell class and a CrossFit class on the same day).

### Workout Section Types
`WARM UP`, `PRIMER`, `OLYMPIC LIFT`, `STRENGTH 1–3`, `ACCESSORY`, `COOL DOWN`, `STRENGTH`, `SKILL`, `HEAVY DAY`, `LOADING UP`, `WOD`, `ON RAMP`.

### Score Types for WODs
`TIME`, `ROUNDS_REPS`, `LOAD`, `CALS`, `DISTANCE`, `INTERVAL`.

---

## 15. Deployment & Infrastructure

- **Hosted on Vercel** with production deployments.
- **Database**: Neon Postgres (serverless).
- **Auth**: Clerk (handles sign-up, sign-in, session management, user metadata).
- **ORM**: Drizzle with type-safe schema.
- **No separate API routes** — all data flows through Next.js Server Actions for type safety and simplicity.

---

## Changelog

### 10 April 2026
- Added benchmark WOD tier system with 26 WODs (18 Girl + 8 Hero).
- Added general strength standards for Bench Press and Deadlift (5-level bodyweight-multiplier system).
- Swiss bar bench press now aliases to Bench Press for strength assessment.
- Combined strength score on progress page now includes both Olympic and general lifts.
- WOD score entry shows tier classification immediately after logging for benchmark WODs.

### 9 April 2026
- Implemented full multi-class architecture (Barbell + CrossFit).
- Added CrossFit workout builder with flexible sections and WOD config.
- Added WOD score logging (TIME, AMRAP, INTERVAL, LOAD, CALS, DISTANCE).
- Added class type tabs on dashboard.
- Seeded CrossFit movements (52) and sample CrossFit week.
- Segmented stats and dashboard by class type.

### Prior
- Core barbell tracking: 1RM management, percentage-based programming, set logging.
- PR detection and celebration overlay.
- Strength standards (Catalyst Athletics 7-level system).
- Leaderboard with opt-in.
- Goal setting with auto-completion.
- Monthly recap and lift charts.
- Coach admin interface with workout builders.
- PWA with offline support.
- Rest timer.
- Plate calculator and warm-up calculator.
