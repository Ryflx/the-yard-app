"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  workouts,
  workoutSections,
  userMaxes,
  userLiftLogs,
} from "@/db/schema";
import type { SectionExercise, WorkoutSectionType } from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { normalizeLiftName } from "@/lib/percentage";

export async function getWorkoutsForWeek(weekStart: string, weekEnd: string) {
  const rows = await db
    .select()
    .from(workouts)
    .where(and(gte(workouts.date, weekStart), lte(workouts.date, weekEnd)))
    .orderBy(workouts.date);

  const result = [];
  for (const workout of rows) {
    const sections = await db
      .select()
      .from(workoutSections)
      .where(eq(workoutSections.workoutId, workout.id))
      .orderBy(workoutSections.sortOrder);
    result.push({ ...workout, sections });
  }

  return result;
}

export async function getWorkoutByDate(date: string) {
  const [workout] = await db
    .select()
    .from(workouts)
    .where(eq(workouts.date, date));

  if (!workout) return null;

  const sections = await db
    .select()
    .from(workoutSections)
    .where(eq(workoutSections.workoutId, workout.id))
    .orderBy(workoutSections.sortOrder);

  return { ...workout, sections };
}

export async function getUserMaxes() {
  const { userId } = await auth();
  if (!userId) return [];

  return db
    .select()
    .from(userMaxes)
    .where(eq(userMaxes.userId, userId))
    .orderBy(userMaxes.liftName);
}

export async function getUserMaxForLift(liftName: string) {
  const { userId } = await auth();
  if (!userId) return null;

  const normalized = normalizeLiftName(liftName);
  const [max] = await db
    .select()
    .from(userMaxes)
    .where(and(eq(userMaxes.userId, userId), eq(userMaxes.liftName, normalized)));

  return max ?? null;
}

export async function setUserMax(liftName: string, weight: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const normalized = normalizeLiftName(liftName);

  const existing = await db
    .select()
    .from(userMaxes)
    .where(and(eq(userMaxes.userId, userId), eq(userMaxes.liftName, normalized)));

  if (existing.length > 0) {
    await db
      .update(userMaxes)
      .set({ maxWeight: weight, updatedAt: new Date() })
      .where(eq(userMaxes.id, existing[0].id));
  } else {
    await db.insert(userMaxes).values({
      userId,
      liftName: normalized,
      maxWeight: weight,
    });
  }

  revalidatePath("/schedule");
  revalidatePath("/progress");
}

export async function logLift(data: {
  workoutId?: number;
  date: string;
  liftName: string;
  weight: number;
  reps?: number;
  sets?: number;
  notes?: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  await db.insert(userLiftLogs).values({
    userId,
    workoutId: data.workoutId ?? null,
    date: data.date,
    liftName: normalizeLiftName(data.liftName),
    weight: data.weight,
    reps: data.reps ?? null,
    sets: data.sets ?? null,
    notes: data.notes ?? null,
  });

  const currentMax = await getUserMaxForLift(data.liftName);
  if (!currentMax || data.weight > currentMax.maxWeight) {
    if (data.reps === 1 || !data.reps) {
      await setUserMax(data.liftName, data.weight);
    }
  }

  revalidatePath("/schedule");
  revalidatePath("/progress");
}

export async function getLiftHistory(liftName?: string) {
  const { userId } = await auth();
  if (!userId) return [];

  const conditions = [eq(userLiftLogs.userId, userId)];
  if (liftName) {
    conditions.push(eq(userLiftLogs.liftName, normalizeLiftName(liftName)));
  }

  return db
    .select()
    .from(userLiftLogs)
    .where(and(...conditions))
    .orderBy(desc(userLiftLogs.createdAt))
    .limit(100);
}

export async function addWorkout(data: {
  date: string;
  title: string;
  sections: {
    type: WorkoutSectionType;
    sets?: string;
    liftName?: string;
    exercises: SectionExercise[];
  }[];
}) {
  const [workout] = await db
    .insert(workouts)
    .values({ date: data.date, title: data.title })
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
    });
  }

  revalidatePath("/schedule");
  return workout;
}
