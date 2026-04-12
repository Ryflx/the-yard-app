"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  workouts,
  workoutSections,
  userMaxes,
  userLiftLogs,
  userProfiles,
  userGoals,
  movements,
  wodResults,
} from "@/db/schema";
import type { SectionExercise, WorkoutSectionType, MovementCategory, ClassType, WodScoreType, WodFormat, WodMovement } from "@/db/schema";
import { eq, and, gte, lte, lt, desc, isNotNull, isNull, or, count, sql, asc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { normalizeLiftName, estimateOneRepMax } from "@/lib/percentage";
import { type RxLevel } from "@/db/schema";
import { compareWodScores, isBetterScore, computeCompositeScore, distanceToNextTier } from "@/lib/wod-scoring";
import { assessWodScore, getAllBenchmarkWods, findBenchmarkWod } from "@/lib/benchmark-wods";
import { parseWorkoutWithAI, type ParsedWorkout } from "@/lib/workout-parser";

export async function getWorkoutsForWeek(weekStart: string, weekEnd: string, classType?: ClassType) {
  const conditions = [gte(workouts.date, weekStart), lte(workouts.date, weekEnd)];
  if (classType) conditions.push(eq(workouts.classType, classType));

  const rows = await db
    .select()
    .from(workouts)
    .where(and(...conditions))
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

export async function getWorkoutByDate(date: string, classType?: ClassType) {
  const conditions = [eq(workouts.date, date)];
  if (classType) conditions.push(eq(workouts.classType, classType));

  const [workout] = await db
    .select()
    .from(workouts)
    .where(and(...conditions));

  if (!workout) return null;

  const sections = await db
    .select()
    .from(workoutSections)
    .where(eq(workoutSections.workoutId, workout.id))
    .orderBy(workoutSections.sortOrder);

  return { ...workout, sections };
}

export async function getWorkoutsByDate(date: string) {
  const rows = await db
    .select()
    .from(workouts)
    .where(eq(workouts.date, date))
    .orderBy(workouts.classType);

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

export async function getWorkoutById(id: number) {
  const [workout] = await db
    .select()
    .from(workouts)
    .where(eq(workouts.id, id));

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

export async function getEstimated1RM(
  liftName: string
): Promise<{ estimatedMax: number; basedOn: { weight: number; reps: number; date: string } } | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const normalized = normalizeLiftName(liftName);
  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
  const cutoff = twelveWeeksAgo.toISOString().slice(0, 10);

  const logs = await db
    .select()
    .from(userLiftLogs)
    .where(
      and(
        eq(userLiftLogs.userId, userId),
        eq(userLiftLogs.liftName, normalized),
        gte(userLiftLogs.date, cutoff),
        or(isNull(userLiftLogs.reps), lte(userLiftLogs.reps, 10))
      )
    );

  if (logs.length === 0) return null;

  let best: { estimatedMax: number; weight: number; reps: number; date: string } | null = null;

  for (const log of logs) {
    const reps = log.reps ?? 1;
    if (reps < 1 || reps > 10) continue;
    const e1rm = estimateOneRepMax(log.weight, reps);
    if (!best || e1rm > best.estimatedMax) {
      best = { estimatedMax: e1rm, weight: log.weight, reps, date: log.date };
    }
  }

  if (!best) return null;

  return {
    estimatedMax: best.estimatedMax,
    basedOn: { weight: best.weight, reps: best.reps, date: best.date },
  };
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
}): Promise<{ isPR: boolean; previousBest: number | null }> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const normalized = normalizeLiftName(data.liftName);

  const [heaviest] = await db
    .select()
    .from(userLiftLogs)
    .where(
      and(eq(userLiftLogs.userId, userId), eq(userLiftLogs.liftName, normalized))
    )
    .orderBy(desc(userLiftLogs.weight))
    .limit(1);

  const previousBest = heaviest?.weight ?? null;
  const isPR = previousBest === null || data.weight > previousBest;

  await db.insert(userLiftLogs).values({
    userId,
    workoutId: data.workoutId ?? null,
    date: data.date,
    liftName: normalized,
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

  if (isPR) {
    const activeGoals = await db
      .select()
      .from(userGoals)
      .where(
        and(
          eq(userGoals.userId, userId),
          eq(userGoals.liftName, normalized),
          sql`${userGoals.completedAt} IS NULL`
        )
      );
    for (const goal of activeGoals) {
      if (data.weight >= goal.targetWeight) {
        await db
          .update(userGoals)
          .set({ completedAt: new Date() })
          .where(eq(userGoals.id, goal.id));
      }
    }
  }

  revalidatePath("/schedule");
  revalidatePath("/progress");

  return { isPR, previousBest };
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

export async function getUserProfile() {
  const { userId } = await auth();
  if (!userId) return null;

  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId));

  return profile ?? null;
}

export async function updateUserProfile(data: {
  displayName?: string;
  bodyweightKg?: number;
  sex?: "male" | "female";
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const existing = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId));

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (data.displayName !== undefined) updates.displayName = data.displayName || null;
  if (data.bodyweightKg !== undefined) updates.bodyweightKg = data.bodyweightKg;
  if (data.sex !== undefined) updates.sex = data.sex;

  if (existing.length > 0) {
    await db
      .update(userProfiles)
      .set(updates)
      .where(eq(userProfiles.userId, userId));
  } else {
    await db.insert(userProfiles).values({
      userId,
      displayName: data.displayName || null,
      bodyweightKg: data.bodyweightKg ?? null,
      sex: data.sex ?? null,
    });
  }

  revalidatePath("/progress");
  revalidatePath("/profile");
  revalidatePath("/schedule");
  revalidatePath("/admin/users");
}

export async function completeOnboarding() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const existing = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId));

  if (existing.length > 0) {
    await db
      .update(userProfiles)
      .set({ onboardingComplete: true })
      .where(eq(userProfiles.userId, userId));
  } else {
    await db.insert(userProfiles).values({
      userId,
      onboardingComplete: true,
    });
  }

  revalidatePath("/schedule");
}

// ── Role management ──

export async function isCurrentUserAdmin(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;

  const [profile] = await db
    .select({ role: userProfiles.role })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId));

  return profile?.role === "admin";
}

export async function hasAnyAdmin(): Promise<boolean> {
  const [result] = await db
    .select({ total: count() })
    .from(userProfiles)
    .where(eq(userProfiles.role, "admin"));

  return (result?.total ?? 0) > 0;
}

export async function claimAdmin(): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const alreadyHasAdmin = await hasAnyAdmin();
  if (alreadyHasAdmin) throw new Error("Admin already exists");

  const existing = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId));

  if (existing.length > 0) {
    await db
      .update(userProfiles)
      .set({ role: "admin", updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId));
  } else {
    await db.insert(userProfiles).values({ userId, role: "admin" });
  }

  revalidatePath("/admin/users");
  revalidatePath("/progress");
}

export async function getAllUserProfiles() {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) throw new Error("Not authorized");

  return db
    .select()
    .from(userProfiles)
    .orderBy(userProfiles.role, userProfiles.createdAt);
}

export async function setUserRole(targetUserId: string, role: "admin" | "member") {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) throw new Error("Not authorized");

  if (targetUserId === userId && role === "member") {
    const [adminCount] = await db
      .select({ total: count() })
      .from(userProfiles)
      .where(eq(userProfiles.role, "admin"));
    if ((adminCount?.total ?? 0) <= 1) {
      throw new Error("Cannot remove the last admin");
    }
  }

  const existing = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, targetUserId));

  if (existing.length > 0) {
    await db
      .update(userProfiles)
      .set({ role, updatedAt: new Date() })
      .where(eq(userProfiles.userId, targetUserId));
  } else {
    await db.insert(userProfiles).values({ userId: targetUserId, role });
  }

  revalidatePath("/admin/users");
}

export async function getProgrammedLiftNames(): Promise<string[]> {
  const rows = await db
    .select({ liftName: workoutSections.liftName })
    .from(workoutSections)
    .where(isNotNull(workoutSections.liftName))
    .groupBy(workoutSections.liftName);

  const seen = new Set<string>();
  return rows
    .map((r) => r.liftName)
    .filter((name): name is string => name !== null)
    .map((name) => normalizeLiftName(name))
    .filter((name) => {
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
}

export async function getExerciseHistory(
  exerciseNames: string[],
  limit = 5
): Promise<
  Record<string, { id: number; weight: number; reps: number | null; unit: string; date: string }[]>
> {
  const { userId } = await auth();
  if (!userId || exerciseNames.length === 0) return {};

  const result: Record<
    string,
    { id: number; weight: number; reps: number | null; unit: string; date: string }[]
  > = {};

  for (const name of exerciseNames) {
    const normalized = normalizeLiftName(name);
    const logs = await db
      .select()
      .from(userLiftLogs)
      .where(
        and(eq(userLiftLogs.userId, userId), eq(userLiftLogs.liftName, normalized))
      )
      .orderBy(desc(userLiftLogs.createdAt))
      .limit(limit);

    if (logs.length > 0) {
      result[name] = logs.map((l) => ({
        id: l.id,
        weight: l.weight,
        reps: l.reps,
        unit: l.unit,
        date: l.date,
      }));
    }
  }

  return result;
}

export async function getPersonalSummaryForWorkouts(
  workoutLifts: { olympicLift?: string; strengthExercises: string[] }[]
): Promise<{
  maxes: Record<string, { maxWeight: number; unit: string }>;
  lastWeights: Record<string, { weight: number; reps: number | null; unit: string }>;
  lastOlympicLogs: Record<string, { weight: number; reps: number | null; unit: string; date: string }>;
}> {
  const { userId } = await auth();
  if (!userId)
    return { maxes: {}, lastWeights: {}, lastOlympicLogs: {} };

  const allOlympicLifts = [
    ...new Set(workoutLifts.map((w) => w.olympicLift).filter(Boolean) as string[]),
  ];
  const allStrengthExercises = [
    ...new Set(workoutLifts.flatMap((w) => w.strengthExercises)),
  ];

  const maxes: Record<string, { maxWeight: number; unit: string }> = {};
  const lastOlympicLogs: Record<string, { weight: number; reps: number | null; unit: string; date: string }> = {};
  for (const lift of allOlympicLifts) {
    const normalized = normalizeLiftName(lift);
    const [max] = await db
      .select()
      .from(userMaxes)
      .where(and(eq(userMaxes.userId, userId), eq(userMaxes.liftName, normalized)));
    if (max) {
      maxes[lift] = { maxWeight: max.maxWeight, unit: max.unit };
    }

    const [lastLog] = await db
      .select()
      .from(userLiftLogs)
      .where(
        and(eq(userLiftLogs.userId, userId), eq(userLiftLogs.liftName, normalized))
      )
      .orderBy(desc(userLiftLogs.createdAt))
      .limit(1);
    if (lastLog) {
      lastOlympicLogs[lift] = {
        weight: lastLog.weight,
        reps: lastLog.reps,
        unit: lastLog.unit,
        date: lastLog.date,
      };
    }
  }

  const lastWeights: Record<string, { weight: number; reps: number | null; unit: string }> = {};
  for (const name of allStrengthExercises) {
    const normalized = normalizeLiftName(name);
    const [log] = await db
      .select()
      .from(userLiftLogs)
      .where(
        and(eq(userLiftLogs.userId, userId), eq(userLiftLogs.liftName, normalized))
      )
      .orderBy(desc(userLiftLogs.createdAt))
      .limit(1);
    if (log) {
      lastWeights[name] = { weight: log.weight, reps: log.reps, unit: log.unit };
    }
  }

  return { maxes, lastWeights, lastOlympicLogs };
}

export async function getLiftChartData(): Promise<
  Record<string, { date: string; weight: number }[]>
> {
  const { userId } = await auth();
  if (!userId) return {};

  const logs = await db
    .select({
      liftName: userLiftLogs.liftName,
      date: userLiftLogs.date,
      weight: userLiftLogs.weight,
    })
    .from(userLiftLogs)
    .where(eq(userLiftLogs.userId, userId))
    .orderBy(userLiftLogs.date);

  const grouped: Record<string, { date: string; weight: number }[]> = {};
  for (const log of logs) {
    if (!grouped[log.liftName]) grouped[log.liftName] = [];
    grouped[log.liftName].push({ date: log.date, weight: log.weight });
  }

  return grouped;
}

export async function getLastLoggedWeights(
  exerciseNames: string[]
): Promise<Record<string, {
  weight: number;
  reps: number | null;
  unit: string;
  prevWeight: number | null;
  prevReps: number | null;
}>> {
  const { userId } = await auth();
  if (!userId || exerciseNames.length === 0) return {};

  const result: Record<string, {
    weight: number;
    reps: number | null;
    unit: string;
    prevWeight: number | null;
    prevReps: number | null;
  }> = {};

  for (const name of exerciseNames) {
    const normalized = normalizeLiftName(name);
    const logs = await db
      .select()
      .from(userLiftLogs)
      .where(
        and(eq(userLiftLogs.userId, userId), eq(userLiftLogs.liftName, normalized))
      )
      .orderBy(desc(userLiftLogs.createdAt))
      .limit(2);

    if (logs.length > 0) {
      result[name] = {
        weight: logs[0].weight,
        reps: logs[0].reps,
        unit: logs[0].unit,
        prevWeight: logs[1]?.weight ?? null,
        prevReps: logs[1]?.reps ?? null,
      };
    }
  }

  return result;
}

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

export async function deleteWorkout(workoutId: number) {
  await db.delete(workouts).where(eq(workouts.id, workoutId));
  revalidatePath("/schedule");
  revalidatePath("/admin/workouts");
}

export async function getUpcomingWorkouts() {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await db
    .select()
    .from(workouts)
    .where(gte(workouts.date, today))
    .orderBy(asc(workouts.date))
    .limit(20);

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

export async function getRecentWorkouts() {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await db
    .select()
    .from(workouts)
    .where(lt(workouts.date, today))
    .orderBy(desc(workouts.date))
    .limit(10);

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

// ── Movement Library ──

export async function getMovements() {
  return db
    .select()
    .from(movements)
    .orderBy(movements.category, movements.name);
}

export async function createMovement(name: string, category: MovementCategory) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) throw new Error("Not authorized");

  const [m] = await db.insert(movements).values({ name, category }).returning();
  revalidatePath("/admin/workouts");
  return m;
}

// ── Streak Tracker ──

export async function getStreakData(): Promise<{
  currentStreak: number;
  longestStreak: number;
  sessionsThisMonth: number;
  totalSessions: number;
}> {
  const { userId } = await auth();
  if (!userId) return { currentStreak: 0, longestStreak: 0, sessionsThisMonth: 0, totalSessions: 0 };

  const liftDates = await db
    .selectDistinct({ date: userLiftLogs.date })
    .from(userLiftLogs)
    .where(eq(userLiftLogs.userId, userId));

  const wodDates = await db
    .select({ date: workouts.date })
    .from(wodResults)
    .innerJoin(workouts, eq(wodResults.workoutId, workouts.id))
    .where(eq(wodResults.userId, userId));

  const allDatesSet = new Set([
    ...liftDates.map((d) => d.date),
    ...wodDates.map((d) => d.date),
  ]);
  const dates = Array.from(allDatesSet).sort().map((d) => ({ date: d }));

  const totalSessions = dates.length;

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const sessionsThisMonth = dates.filter((d) => d.date >= monthStart).length;

  if (dates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, sessionsThisMonth, totalSessions };
  }

  function getISOWeek(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
  }

  const weeks = Array.from(new Set(dates.map((d) => getISOWeek(d.date)))).sort();

  let longest = 1;
  let current = 1;
  for (let i = 1; i < weeks.length; i++) {
    const [prevY, prevW] = weeks[i - 1].split("-W").map(Number);
    const [curY, curW] = weeks[i].split("-W").map(Number);
    const isConsecutive =
      (curY === prevY && curW === prevW + 1) ||
      (curY === prevY + 1 && prevW >= 52 && curW === 1);
    if (isConsecutive) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }

  const currentWeek = getISOWeek(now.toISOString().slice(0, 10));
  const lastLoggedWeek = weeks[weeks.length - 1];
  const [cY, cW] = currentWeek.split("-W").map(Number);
  const [lY, lW] = lastLoggedWeek.split("-W").map(Number);
  const isCurrentOrLast =
    (cY === lY && (cW === lW || cW === lW + 1)) ||
    (cY === lY + 1 && lW >= 52 && cW <= 1);

  const currentStreak = isCurrentOrLast ? current : 0;

  return { currentStreak, longestStreak: longest, sessionsThisMonth, totalSessions };
}

// ── Leaderboard ──

export async function updateLeaderboardOptIn(optIn: boolean) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const [existing] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId));

  if (existing) {
    await db
      .update(userProfiles)
      .set({ leaderboardOptIn: optIn, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId));
  } else {
    await db.insert(userProfiles).values({
      userId,
      leaderboardOptIn: optIn,
    });
  }

  revalidatePath("/profile");
  revalidatePath("/leaderboard");
}

export async function getLeaderboardData(): Promise<{
  lifts: string[];
  entries: Record<string, { userId: string; displayName: string; weight: number; unit: string }[]>;
  currentUserId: string | null;
}> {
  const { userId } = await auth();

  const optedIn = await db
    .select({
      userId: userProfiles.userId,
      displayName: userProfiles.displayName,
    })
    .from(userProfiles)
    .where(eq(userProfiles.leaderboardOptIn, true));

  if (optedIn.length === 0) {
    return { lifts: [], entries: {}, currentUserId: userId };
  }

  const userIds = optedIn.map((u) => u.userId);
  const nameMap = new Map(optedIn.map((u) => [u.userId, u.displayName || "ANONYMOUS"]));

  const allMaxes = await db
    .select()
    .from(userMaxes)
    .where(inArray(userMaxes.userId, userIds));

  const grouped: Record<string, { userId: string; displayName: string; weight: number; unit: string }[]> = {};

  for (const m of allMaxes) {
    const lift = m.liftName;
    if (!grouped[lift]) grouped[lift] = [];
    const existing = grouped[lift].find((e) => e.userId === m.userId);
    if (!existing || m.maxWeight > existing.weight) {
      if (existing) {
        existing.weight = m.maxWeight;
        existing.unit = m.unit;
      } else {
        grouped[lift].push({
          userId: m.userId,
          displayName: nameMap.get(m.userId) || "ANONYMOUS",
          weight: m.maxWeight,
          unit: m.unit,
        });
      }
    }
  }

  for (const lift of Object.keys(grouped)) {
    grouped[lift].sort((a, b) => b.weight - a.weight);
  }

  return { lifts: Object.keys(grouped).sort(), entries: grouped, currentUserId: userId };
}

// ── Monthly Recap ──

export async function getMonthlyRecap(): Promise<{
  month: string;
  totalSessions: number;
  totalVolume: number;
  prsThisMonth: number;
  topLift: { name: string; weight: number; unit: string } | null;
  lastMonthSessions: number;
}> {
  const { userId } = await auth();
  if (!userId) return { month: "", totalSessions: 0, totalVolume: 0, prsThisMonth: 0, topLift: null, lastMonthSessions: 0 };

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthStart = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-01`;

  const thisMonthLogs = await db
    .select()
    .from(userLiftLogs)
    .where(and(eq(userLiftLogs.userId, userId), gte(userLiftLogs.date, monthStart)));

  const prevMonthLogs = await db
    .selectDistinct({ date: userLiftLogs.date })
    .from(userLiftLogs)
    .where(
      and(
        eq(userLiftLogs.userId, userId),
        gte(userLiftLogs.date, prevMonthStart),
        lt(userLiftLogs.date, monthStart)
      )
    );

  const sessionDates = new Set(thisMonthLogs.map((l) => l.date));
  const totalSessions = sessionDates.size;
  const lastMonthSessions = prevMonthLogs.length;

  let totalVolume = 0;
  let topLift: { name: string; weight: number; unit: string } | null = null;

  for (const log of thisMonthLogs) {
    totalVolume += log.weight * (log.reps || 1);
    if (!topLift || log.weight > topLift.weight) {
      topLift = { name: log.liftName, weight: log.weight, unit: log.unit };
    }
  }

  let prsThisMonth = 0;
  const bestBefore: Record<string, number> = {};
  const allLogs = await db
    .select()
    .from(userLiftLogs)
    .where(and(eq(userLiftLogs.userId, userId), lte(userLiftLogs.date, monthStart)))
    .orderBy(desc(userLiftLogs.weight));

  for (const log of allLogs) {
    if (!bestBefore[log.liftName] || log.weight > bestBefore[log.liftName]) {
      bestBefore[log.liftName] = log.weight;
    }
  }

  for (const log of thisMonthLogs) {
    const prev = bestBefore[log.liftName] || 0;
    if (log.weight > prev) {
      prsThisMonth++;
      bestBefore[log.liftName] = log.weight;
    }
  }

  const monthName = now.toLocaleString("en-US", { month: "long", year: "numeric" }).toUpperCase();

  return { month: monthName, totalSessions, totalVolume: Math.round(totalVolume), prsThisMonth, topLift, lastMonthSessions };
}

// ── Goal Setting ──

export async function createGoal(data: {
  liftName: string;
  targetWeight: number;
  targetDate?: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  await db.insert(userGoals).values({
    userId,
    liftName: normalizeLiftName(data.liftName),
    targetWeight: data.targetWeight,
    targetDate: data.targetDate || null,
  });

  revalidatePath("/progress");
}

export async function getUserGoals(): Promise<
  {
    id: number;
    liftName: string;
    targetWeight: number;
    targetDate: string | null;
    currentMax: number | null;
    completedAt: Date | null;
  }[]
> {
  const { userId } = await auth();
  if (!userId) return [];

  const goals = await db
    .select()
    .from(userGoals)
    .where(eq(userGoals.userId, userId))
    .orderBy(desc(userGoals.createdAt));

  const maxes = await db
    .select()
    .from(userMaxes)
    .where(eq(userMaxes.userId, userId));

  const maxMap = new Map(maxes.map((m) => [m.liftName, m.maxWeight]));

  return goals.map((g) => ({
    id: g.id,
    liftName: g.liftName,
    targetWeight: g.targetWeight,
    targetDate: g.targetDate,
    currentMax: maxMap.get(g.liftName) ?? null,
    completedAt: g.completedAt,
  }));
}

export async function deleteGoal(goalId: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  await db
    .delete(userGoals)
    .where(and(eq(userGoals.id, goalId), eq(userGoals.userId, userId)));

  revalidatePath("/progress");
}

// ── WOD Results ──

export async function logWodResult(data: {
  workoutId: number;
  sectionId: number;
  scoreType: WodScoreType;
  scoreValue: string;
  rxLevel: RxLevel;
  public?: boolean;
  notes?: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  await db.insert(wodResults).values({
    userId,
    workoutId: data.workoutId,
    sectionId: data.sectionId,
    scoreType: data.scoreType,
    scoreValue: data.scoreValue,
    rxLevel: data.rxLevel,
    public: data.public ?? true,
    notes: data.notes ?? null,
  });

  revalidatePath("/schedule");
  revalidatePath("/progress");
  revalidatePath("/leaderboard");
}

export async function getWodResult(sectionId: number) {
  const { userId } = await auth();
  if (!userId) return null;

  const [result] = await db
    .select()
    .from(wodResults)
    .where(and(eq(wodResults.userId, userId), eq(wodResults.sectionId, sectionId)))
    .orderBy(desc(wodResults.createdAt))
    .limit(1);

  return result ?? null;
}

export async function getWodLeaderboard(
  sectionId: number,
  rxLevel: RxLevel
): Promise<{
  entries: { userId: string; displayName: string; scoreValue: string; rxLevel: RxLevel; position: number }[];
  currentUserId: string | null;
  scoreType: WodScoreType | null;
}> {
  const { userId } = await auth();

  const section = await db
    .select({ wodScoreType: workoutSections.wodScoreType })
    .from(workoutSections)
    .where(eq(workoutSections.id, sectionId))
    .limit(1);

  const scoreType = (section[0]?.wodScoreType as WodScoreType) ?? null;

  const optedInUsers = await db
    .select({ userId: userProfiles.userId })
    .from(userProfiles)
    .where(eq(userProfiles.leaderboardOptIn, true));

  const optedInIds = new Set(optedInUsers.map((u) => u.userId));

  const results = await db
    .select()
    .from(wodResults)
    .where(
      and(
        eq(wodResults.sectionId, sectionId),
        eq(wodResults.rxLevel, rxLevel),
        eq(wodResults.public, true)
      )
    );

  const filtered = results.filter((r) => optedInIds.has(r.userId));

  const bestByUser = new Map<string, typeof filtered[0]>();
  for (const r of filtered) {
    const existing = bestByUser.get(r.userId);
    if (!existing || (scoreType && isBetterScore(r.scoreValue, existing.scoreValue, scoreType))) {
      bestByUser.set(r.userId, r);
    }
  }

  const sorted = Array.from(bestByUser.values());
  if (scoreType) {
    sorted.sort((a, b) => compareWodScores(a.scoreValue, b.scoreValue, scoreType));
  }

  const userIds = sorted.map((r) => r.userId);
  const profiles = userIds.length > 0
    ? await db
        .select({ userId: userProfiles.userId, displayName: userProfiles.displayName })
        .from(userProfiles)
        .where(inArray(userProfiles.userId, userIds))
    : [];

  const nameMap = new Map(profiles.map((p) => [p.userId, p.displayName || "ANONYMOUS"]));

  const entries = sorted.map((r, i) => ({
    userId: r.userId,
    displayName: nameMap.get(r.userId) || "ANONYMOUS",
    scoreValue: r.scoreValue,
    rxLevel: r.rxLevel as RxLevel,
    position: i + 1,
  }));

  return { entries, currentUserId: userId, scoreType };
}

export async function getCrossfitLeaderboardData(rxLevel: RxLevel) {
  const { userId } = await auth();

  const optedInUsers = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.leaderboardOptIn, true));

  const optedInIds = new Set(optedInUsers.map((u) => u.userId));

  const allPublicResults = await db
    .select()
    .from(wodResults)
    .where(and(eq(wodResults.rxLevel, rxLevel), eq(wodResults.public, true)));

  const filtered = allPublicResults.filter((r) => optedInIds.has(r.userId));

  const benchmarkWods = getAllBenchmarkWods();
  const benchmarkNames = new Set(benchmarkWods.map((w) => w.name.toLowerCase()));

  const allSectionIds = [...new Set(filtered.map((r) => r.sectionId))];
  const sections = allSectionIds.length > 0
    ? await db
        .select({ id: workoutSections.id, wodName: workoutSections.wodName, wodScoreType: workoutSections.wodScoreType })
        .from(workoutSections)
        .where(inArray(workoutSections.id, allSectionIds))
    : [];

  const sectionMap = new Map(sections.map((s) => [s.id, s]));

  type UserWodBest = { wodName: string; scoreValue: string; scoreType: string };
  const userBests = new Map<string, Map<string, UserWodBest>>();

  for (const r of filtered) {
    const section = sectionMap.get(r.sectionId);
    if (!section?.wodName) continue;
    const wodLower = section.wodName.toLowerCase();
    if (!benchmarkNames.has(wodLower)) continue;

    if (!userBests.has(r.userId)) userBests.set(r.userId, new Map());
    const userMap = userBests.get(r.userId)!;
    const existing = userMap.get(wodLower);
    const st = section.wodScoreType as WodScoreType;

    if (!existing || isBetterScore(r.scoreValue, existing.scoreValue, st)) {
      userMap.set(wodLower, { wodName: section.wodName, scoreValue: r.scoreValue, scoreType: st });
    }
  }

  const nameMap = new Map(optedInUsers.map((u) => [u.userId, u.displayName || "ANONYMOUS"]));

  const rankings = Array.from(userBests.entries())
    .map(([uid, wods]) => {
      const sex = optedInUsers.find((u) => u.userId === uid)?.sex as "male" | "female" | null;
      const tierResults: { wodName: string; tierName: string }[] = [];
      const tierCounts: Record<string, number> = {};

      for (const [, best] of wods) {
        if (!sex) continue;
        const st = best.scoreType === "INTERVAL" ? "TIME" : best.scoreType;
        if (st !== "TIME" && st !== "ROUNDS_REPS") continue;
        const result = assessWodScore(best.wodName, best.scoreValue, st as "TIME" | "ROUNDS_REPS", sex);
        if (result) {
          tierResults.push({ wodName: best.wodName, tierName: result.tier.name });
          tierCounts[result.tier.name] = (tierCounts[result.tier.name] || 0) + 1;
        }
      }

      const { score, overallTier, pointsToNextTier, nextTier } = computeCompositeScore(tierResults);

      return {
        userId: uid,
        displayName: nameMap.get(uid) || "ANONYMOUS",
        compositeScore: score,
        overallTier,
        tierCounts,
        wodsAttempted: wods.size,
        pointsToNextTier,
        nextTier,
      };
    })
    .filter((r) => r.wodsAttempted >= 3)
    .sort((a, b) => b.compositeScore - a.compositeScore);

  let currentUser = null;
  let myBests: Map<string, UserWodBest> | null = null;
  let mySex: "male" | "female" | null = null;

  if (userId) {
    // Query the current user's profile directly (works even if not opted-in)
    const [myProfile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    mySex = (myProfile?.sex as "male" | "female" | null) ?? null;

    // Use opted-in data if available, otherwise query the user's own results
    myBests = userBests.get(userId) ?? null;
    if (!myBests) {
      const myResults = await db
        .select()
        .from(wodResults)
        .where(and(eq(wodResults.userId, userId), eq(wodResults.rxLevel, rxLevel)));
      myBests = new Map();
      for (const r of myResults) {
        const section = sectionMap.get(r.sectionId);
        if (!section?.wodName) continue;
        const wodLower = section.wodName.toLowerCase();
        if (!benchmarkNames.has(wodLower)) continue;
        const st = section.wodScoreType as WodScoreType;
        const existing = myBests.get(wodLower);
        if (!existing || isBetterScore(r.scoreValue, existing.scoreValue, st)) {
          myBests.set(wodLower, { wodName: section.wodName, scoreValue: r.scoreValue, scoreType: st });
        }
      }
    }

    if (myBests.size > 0) {
      const tierResults: { wodName: string; tierName: string }[] = [];
      const tierCounts: Record<string, number> = {};

      for (const [, best] of myBests) {
        if (!mySex) continue;
        const st = best.scoreType === "INTERVAL" ? "TIME" : best.scoreType;
        if (st !== "TIME" && st !== "ROUNDS_REPS") continue;
        const result = assessWodScore(best.wodName, best.scoreValue, st as "TIME" | "ROUNDS_REPS", mySex);
        if (result) {
          tierResults.push({ wodName: best.wodName, tierName: result.tier.name });
          tierCounts[result.tier.name] = (tierCounts[result.tier.name] || 0) + 1;
        }
      }

      const { score, overallTier, pointsToNextTier, nextTier } = computeCompositeScore(tierResults);
      currentUser = { userId, compositeScore: score, overallTier, tierCounts, pointsToNextTier, nextTier };
    }
  }

  const benchmarkWodCards = benchmarkWods.map((w) => {
    const userBest = myBests?.get(w.name.toLowerCase());
    let userBestTier: string | null = null;
    if (userBest && mySex) {
      const st = userBest.scoreType === "INTERVAL" ? "TIME" : userBest.scoreType;
      if (st === "TIME" || st === "ROUNDS_REPS") {
        const result = assessWodScore(w.name, userBest.scoreValue, st as "TIME" | "ROUNDS_REPS", mySex);
        userBestTier = result?.tier.name ?? null;
      }
    }
    return {
      name: w.name,
      description: w.description,
      scoreType: w.scoreType,
      userBestTier,
    };
  });

  return { rankings, currentUser, benchmarkWods: benchmarkWodCards, currentUserId: userId };
}

export async function getWodDrilldown(wodName: string, rxLevel: RxLevel) {
  const { userId } = await auth();

  const benchmark = findBenchmarkWod(wodName);
  if (!benchmark) return null;

  const sections = await db
    .select({ id: workoutSections.id, wodScoreType: workoutSections.wodScoreType })
    .from(workoutSections)
    .where(eq(workoutSections.wodName, wodName));

  const sectionIds = sections.map((s) => s.id);
  if (sectionIds.length === 0) return { wod: benchmark, userBest: null, entries: [], currentUserId: userId };

  const scoreType = (sections[0].wodScoreType as WodScoreType) ?? benchmark.scoreType;

  const optedInUsers = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.leaderboardOptIn, true));

  const optedInIds = new Set(optedInUsers.map((u) => u.userId));

  const results = await db
    .select()
    .from(wodResults)
    .where(
      and(
        inArray(wodResults.sectionId, sectionIds),
        eq(wodResults.rxLevel, rxLevel),
        eq(wodResults.public, true)
      )
    );

  const filtered = results.filter((r) => optedInIds.has(r.userId));

  const bestByUser = new Map<string, typeof filtered[0]>();
  for (const r of filtered) {
    const existing = bestByUser.get(r.userId);
    if (!existing || isBetterScore(r.scoreValue, existing.scoreValue, scoreType)) {
      bestByUser.set(r.userId, r);
    }
  }

  const sorted = Array.from(bestByUser.values());
  sorted.sort((a, b) => compareWodScores(a.scoreValue, b.scoreValue, scoreType));

  const nameMap = new Map(optedInUsers.map((u) => [u.userId, u.displayName || "ANONYMOUS"]));

  const entries = sorted.map((r, i) => {
    const sex = optedInUsers.find((u) => u.userId === r.userId)?.sex as "male" | "female" | null;
    let tier: string | null = null;
    if (sex) {
      const st = scoreType === "INTERVAL" ? "TIME" : scoreType;
      if (st === "TIME" || st === "ROUNDS_REPS") {
        const result = assessWodScore(wodName, r.scoreValue, st as "TIME" | "ROUNDS_REPS", sex);
        tier = result?.tier.name ?? null;
      }
    }
    return {
      userId: r.userId,
      displayName: nameMap.get(r.userId) || "ANONYMOUS",
      scoreValue: r.scoreValue,
      tier,
      position: i + 1,
    };
  });

  let userBest = null;
  if (userId) {
    const allMyResults = await db
      .select()
      .from(wodResults)
      .where(
        and(
          eq(wodResults.userId, userId),
          inArray(wodResults.sectionId, sectionIds),
          eq(wodResults.rxLevel, rxLevel)
        )
      );

    if (allMyResults.length > 0) {
      const best = allMyResults.reduce((a, b) =>
        isBetterScore(a.scoreValue, b.scoreValue, scoreType) ? a : b
      );

      // Query user profile directly so tier data works even when not opted-in
      const [myProfile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
      const sex = (myProfile?.sex as "male" | "female" | null) ?? null;
      let tier: string | null = null;
      let percentile: string | null = null;
      let distToNext: string | null = null;
      let nextTier: string | null = null;

      if (sex) {
        const st = scoreType === "INTERVAL" ? "TIME" : scoreType;
        if (st === "TIME" || st === "ROUNDS_REPS") {
          const result = assessWodScore(wodName, best.scoreValue, st as "TIME" | "ROUNDS_REPS", sex);
          if (result) {
            tier = result.tier.name;
            percentile = result.percentileLabel;
            distToNext = distanceToNextTier(best.scoreValue, scoreType, wodName, sex, result.tierIndex);
            const tierNames = ["DRAGON", "BEAST", "WARRIOR", "HUNTER", "ROOKIE"];
            nextTier = result.tierIndex > 0 ? tierNames[result.tierIndex - 1] : null;
          }
        }
      }

      userBest = {
        scoreValue: best.scoreValue,
        rxLevel: best.rxLevel,
        tier,
        percentile,
        date: best.createdAt.toISOString().split("T")[0],
        distanceToNextTier: distToNext,
        nextTier,
      };
    }
  }

  return {
    wod: { name: benchmark.name, description: benchmark.description, scoreType: benchmark.scoreType },
    userBest,
    entries,
    currentUserId: userId,
  };
}

export async function parseWorkoutText(input: {
  text: string;
}): Promise<ParsedWorkout> {
  const allMovements = await db.select({ name: movements.name }).from(movements);
  const movementNames = allMovements.map((m) => m.name);
  return parseWorkoutWithAI(input.text, movementNames);
}
