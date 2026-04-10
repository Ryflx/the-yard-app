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
} from "drizzle-orm/pg-core";

export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().unique(),
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
  | "COOL DOWN";

export interface PercentageSet {
  reps: string;
  percentage: number;
}

export interface SectionExercise {
  name: string;
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
