# THE YARD PECKHAM

Track barbell workouts, log weights, and get automatic percentage-based suggestions for Olympic lifts.

## Tech Stack

- **Next.js 16** (App Router, Server Components, Server Actions)
- **Clerk** (authentication)
- **Neon Postgres** + **Drizzle ORM** (database)
- **Tailwind CSS** + **shadcn/ui** (styling)
- **Vercel** (deployment)

## Getting Started

### 1. Clone and install

```bash
npm install
```

### 2. Set up services

**Clerk** — Create a project at [clerk.com](https://clerk.com) and copy your keys.

**Neon** — Create a database at [neon.tech](https://neon.tech) and copy the connection string.

### 3. Configure environment

Copy `.env.local.example` to `.env.local` and fill in your keys:

```bash
cp .env.local.example .env.local
```

### 4. Push database schema

```bash
npm run db:push
```

### 5. Seed dummy workouts (optional)

```bash
npm run db:seed
```

### 6. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- **Schedule View** — Weekly overview of programmed workouts
- **Workout Detail** — Full workout with percentage calculator based on your 1RM
- **Weight Logging** — Log what you lifted for each exercise
- **Progress Tracking** — View personal records and lift history
- **Admin Ingestion** — Paste workout text to add new programming

## Project Structure

```
src/
  app/
    (app)/           — authenticated app routes
      schedule/      — weekly workout schedule
      workout/[date] — single workout detail
      progress/      — personal records & history
      admin/workouts — add workouts (coach/admin)
    sign-in/         — Clerk sign-in
    sign-up/         — Clerk sign-up
  components/        — shared UI components
  db/                — Drizzle schema & database client
  lib/               — helpers (percentage calc, workout parser)
```
