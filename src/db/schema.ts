import { sql } from "drizzle-orm";
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

export type ClassType = "BARBELL" | "CROSSFIT" | "ENGINES" | "OTHER" | "CUSTOM";

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
  seenTourModules: jsonb("seen_tour_modules").notNull().default(sql`'[]'::jsonb`),
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
  repsText: text("reps_text"),
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
    date: date("date").notNull(),
    originalName: text("original_name").notNull(),
    replacements: text("replacements").array().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("user_exercise_substitutions_unique").on(
      t.userId,
      t.workoutId,
      t.date,
      t.originalName
    ),
  ]
);

export type SkillCategory =
  | "jump_rope"
  | "gymnastics_pull"
  | "handstand"
  | "conditioning"
  | "mobility"
  | "lifting"
  | "weightlifting";

export type MovementPattern =
  | "pull"
  | "press"
  | "overhead"
  | "squat"
  | "hinge"
  | "core"
  | "conditioning"
  | "jump"
  | "unilateral";

export const skillCourses = pgTable("skill_courses", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  sourceUrl: text("source_url").notNull(),
  totalWeeks: integer("total_weeks").notNull(),
  category: text("category").notNull().$type<SkillCategory>(),
  prerequisiteSkillId: integer("prerequisite_skill_id"),
  difficulty: integer("difficulty").notNull(),
  estimatedSessionMinutes: integer("estimated_session_minutes").notNull(),
  drillsPerWeek: integer("drills_per_week").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export interface SkillDrillSectionItem {
  movement: string;
  sets?: number;
  reps?: string | number;
  minute?: number;
  notes?: string;
  has_video?: boolean;
}

export interface SkillDrillSection {
  name: string;
  items: SkillDrillSectionItem[];
}

export const skillDrills = pgTable(
  "skill_drills",
  {
    id: serial("id").primaryKey(),
    courseId: integer("course_id")
      .notNull()
      .references(() => skillCourses.id, { onDelete: "cascade" }),
    week: integer("week").notNull(),
    orderInWeek: integer("order_in_week").notNull(),
    externalId: text("external_id").notNull(),
    title: text("title").notNull(),
    sections: jsonb("sections").$type<SkillDrillSection[]>().notNull(),
    movementsSummary: text("movements_summary").notNull(),
    primaryMovementPatterns: text("primary_movement_patterns").array().notNull().$type<MovementPattern[]>(),
  },
  (t) => [uniqueIndex("skill_drills_unique").on(t.courseId, t.externalId)]
);

export interface WeeklyDrillSlot {
  dow: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
  when: "before_class" | "after_class" | "open_gym";
  minutes: 15 | 30 | 45 | 60;
}

export interface GenerationMeta {
  rulesVersion: string;
  generatedAt: string; // ISO
}

export const customPlans = pgTable(
  "custom_plans",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("active").$type<"active" | "paused" | "completed">(),
    goalSummary: text("goal_summary").notNull(),
    weeklyDrillSlots: jsonb("weekly_drill_slots").$type<WeeklyDrillSlot[]>().notNull(),
    selectedSkillIds: integer("selected_skill_ids").array().notNull(),
    planLengthWeeks: integer("plan_length_weeks").notNull().default(8),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    generationMeta: jsonb("generation_meta").$type<GenerationMeta>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("custom_plans_one_active")
      .on(t.userId)
      .where(sql`status = 'active'`),
  ]
);

export const customPlanSessions = pgTable("custom_plan_sessions", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id")
    .notNull()
    .references(() => customPlans.id, { onDelete: "cascade" }),
  workoutId: integer("workout_id").references(() => workouts.id, { onDelete: "set null" }),
  drillId: integer("drill_id").notNull().references(() => skillDrills.id),
  originalDrillId: integer("original_drill_id").references(() => skillDrills.id),
  plannedDate: date("planned_date").notNull(),
  plannedSlotMinutes: integer("planned_slot_minutes").notNull(),
  llmRationale: text("llm_rationale"),
  status: text("status").notNull().default("pending").$type<"pending" | "completed" | "skipped" | "swapped">(),
});

export const goalQuestionnaires = pgTable("goal_questionnaires", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  planId: integer("plan_id").references(() => customPlans.id, { onDelete: "set null" }),
  answers: jsonb("answers").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
