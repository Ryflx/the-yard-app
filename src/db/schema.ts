import {
  pgTable,
  serial,
  text,
  date,
  integer,
  real,
  timestamp,
  jsonb,
  uniqueIndex,
  boolean,
} from "drizzle-orm/pg-core";

export type ClassType = "BARBELL" | "CROSSFIT" | "ENGINES" | "OTHER";

export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  classType: text("class_type").notNull().default("BARBELL").$type<ClassType>(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WorkoutSectionType =
  | "WARM UP"
  | "PRIMER"
  | "OLYMPIC LIFT"
  | "STRENGTH 1"
  | "STRENGTH 2"
  | "STRENGTH 3"
  | "ACCESSORY"
  | "COOL DOWN"
  | "STRENGTH"
  | "SKILL"
  | "HEAVY DAY"
  | "LOADING UP"
  | "WOD"
  | "ON RAMP";

export type WodScoreType = "TIME" | "ROUNDS_REPS" | "LOAD" | "CALS" | "DISTANCE" | "INTERVAL";

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

export type RxLevel = "SCALED" | "RX" | "RX_PLUS";

export interface PercentageSet {
  reps: string;
  percentage: number;
}

export interface SectionExercise {
  name: string;
  reps?: string;
  weight?: string;
  percentageSets?: PercentageSet[];
}

export const workoutSections = pgTable("workout_sections", {
  id: serial("id").primaryKey(),
  workoutId: integer("workout_id")
    .references(() => workouts.id, { onDelete: "cascade" })
    .notNull(),
  type: text("type").notNull().$type<WorkoutSectionType>(),
  sortOrder: integer("sort_order").notNull(),
  liftName: text("lift_name"),
  sets: text("sets"),
  exercises: jsonb("exercises").$type<SectionExercise[]>().notNull(),
  wodScoreType: text("wod_score_type").$type<WodScoreType>(),
  timeCap: integer("time_cap_seconds"),
  wodName: text("wod_name"),
  rxWeights: text("rx_weights"),
  wodFormat: text("wod_format").$type<WodFormat>(),
  wodRounds: integer("wod_rounds"),
  wodInterval: integer("wod_interval"),
  wodDescription: text("wod_description"),
  wodMovements: jsonb("wod_movements").$type<WodMovement[]>(),
});

export const userMaxes = pgTable(
  "user_maxes",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    liftName: text("lift_name").notNull(),
    maxWeight: real("max_weight").notNull(),
    unit: text("unit").notNull().default("kg"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("user_lift_idx").on(table.userId, table.liftName)]
);

export type UserRole = "member" | "admin";

export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  displayName: text("display_name"),
  role: text("role").notNull().default("member").$type<UserRole>(),
  bodyweightKg: real("bodyweight_kg"),
  sex: text("sex").$type<"male" | "female">(),
  leaderboardOptIn: boolean("leaderboard_opt_in").notNull().default(false),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userGoals = pgTable("user_goals", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  liftName: text("lift_name").notNull(),
  targetWeight: real("target_weight").notNull(),
  targetDate: date("target_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export type MovementCategory =
  | "OLYMPIC"
  | "STRENGTH"
  | "ACCESSORY"
  | "WARM UP"
  | "CONDITIONING"
  | "GYMNASTICS";

export const movements = pgTable("movements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  category: text("category").notNull().$type<MovementCategory>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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

export const userLiftLogs = pgTable("user_lift_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  workoutId: integer("workout_id").references(() => workouts.id, {
    onDelete: "cascade",
  }),
  date: date("date").notNull(),
  liftName: text("lift_name").notNull(),
  weight: real("weight").notNull(),
  reps: integer("reps"),
  sets: integer("sets"),
  unit: text("unit").notNull().default("kg"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
