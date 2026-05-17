import type { WeaknessSignal } from "./types";
import { db } from "@/db";
import { skillCourses, wodResults, userLiftLogs, workoutSections, workouts } from "@/db/schema";
import { sql, eq, and, gte } from "drizzle-orm";

export function movementGapSignal(args: {
  skillId: number;
  skillName: string;
  rxCount: number;
  programmedCount: number;
}): WeaknessSignal | null {
  if (args.programmedCount === 0) return null;
  if (args.rxCount > 0) return null;
  const strength = Math.min(1, args.programmedCount / 10);
  return {
    skillId: args.skillId,
    signalStrength: 0.5 + strength * 0.5,
    reason: `You've never logged Rx on ${args.skillName} in ${args.programmedCount} logged WODs that programmed it`,
  };
}

export function rpeFlagSignal(args: {
  skillId: number;
  pattern: string;
  avgRpe: number;
  sampleSize: number;
}): WeaknessSignal | null {
  if (args.sampleSize < 5) return null;
  if (args.avgRpe <= 8.5) return null;
  const strength = Math.min(1, (args.avgRpe - 8.5) / 1.5);
  return {
    skillId: args.skillId,
    signalStrength: 0.4 + strength * 0.4,
    reason: `Your ${args.pattern} lifts are averaging RPE ${args.avgRpe.toFixed(1)} — ${args.pattern} skill work may help`,
  };
}

export function frequencyGapSignal(args: {
  skillId: number;
  gymnasticsCount14d: number;
  crossfitCount14d: number;
}): WeaknessSignal | null {
  if (args.gymnasticsCount14d > 0) return null;
  if (args.crossfitCount14d < 3) return null;
  return {
    skillId: args.skillId,
    signalStrength: 0.55,
    reason: "You're doing CrossFit but skipping gymnastics — pull/push gym work suggested",
  };
}

export function failedCompletionSignal(args: {
  skillId: number;
  wodName: string;
  movement: string;
  roundsCompleted: number;
  prescribedRounds: number;
}): WeaknessSignal | null {
  if (args.roundsCompleted >= args.prescribedRounds) return null;
  const shortfall = (args.prescribedRounds - args.roundsCompleted) / args.prescribedRounds;
  return {
    skillId: args.skillId,
    signalStrength: 0.4 + shortfall * 0.4,
    reason: `You stopped short on ${args.wodName} — ${args.movement} may be the bottleneck`,
  };
}

export function rankSignals(signals: WeaknessSignal[]): WeaknessSignal[] {
  const bySkill = new Map<number, WeaknessSignal>();
  for (const s of signals) {
    const existing = bySkill.get(s.skillId);
    if (!existing || s.signalStrength > existing.signalStrength) bySkill.set(s.skillId, s);
  }
  return Array.from(bySkill.values()).sort((a, b) => b.signalStrength - a.signalStrength);
}

export async function getWeaknessSignalsForUser(userId: string): Promise<WeaknessSignal[]> {
  const courses = await db.select({ id: skillCourses.id, name: skillCourses.name, category: skillCourses.category }).from(skillCourses);

  const signals: WeaknessSignal[] = [];

  // 1. Movement-gap (per course, by course name in wod_movements)
  for (const c of courses) {
    const rows = await db.execute(sql`
      SELECT
        COUNT(DISTINCT wod_results.id) FILTER (WHERE wod_results.rx_level IN ('RX','RX_PLUS')) AS rx_count,
        COUNT(DISTINCT workout_sections.id) AS programmed_count
      FROM workout_sections
      LEFT JOIN wod_results ON wod_results.section_id = workout_sections.id AND wod_results.user_id = ${userId}
      WHERE workout_sections.wod_movements::text ILIKE ${"%" + c.name + "%"}
    `);
    const r = (rows as unknown as { rows: Array<{ rx_count: number; programmed_count: number }> }).rows[0];
    if (!r) continue;
    const s = movementGapSignal({
      skillId: c.id,
      skillName: c.name,
      rxCount: Number(r.rx_count) || 0,
      programmedCount: Number(r.programmed_count) || 0,
    });
    if (s) signals.push(s);
  }

  // 2. RPE flag (parse "RPE X.X" or "RPE X" from user_lift_logs.notes, last 30d)
  const last30 = new Date(); last30.setUTCDate(last30.getUTCDate() - 30);
  const last30Iso = last30.toISOString().slice(0, 10);
  const rpeRows = await db
    .select({ liftName: userLiftLogs.liftName, notes: userLiftLogs.notes })
    .from(userLiftLogs)
    .where(and(eq(userLiftLogs.userId, userId), gte(userLiftLogs.date, last30Iso)));
  const rpeByPattern = new Map<string, { sum: number; count: number }>();
  for (const row of rpeRows) {
    if (!row.notes) continue;
    const m = row.notes.match(/\brpe\s*([\d.]+)/i);
    if (!m) continue;
    const rpe = parseFloat(m[1]);
    if (!Number.isFinite(rpe)) continue;
    const lift = row.liftName.toLowerCase();
    let pattern: string | null = null;
    if (/press|jerk|snatch|clean|push/.test(lift)) pattern = "overhead";
    else if (/squat/.test(lift)) pattern = "squat";
    else if (/deadlift|rdl|pull/.test(lift)) pattern = "hinge";
    if (!pattern) continue;
    const agg = rpeByPattern.get(pattern) ?? { sum: 0, count: 0 };
    agg.sum += rpe; agg.count += 1;
    rpeByPattern.set(pattern, agg);
  }
  const patternToCategory: Record<string, string> = { overhead: "handstand", squat: "lifting", hinge: "lifting" };
  for (const [pattern, agg] of rpeByPattern.entries()) {
    if (agg.count < 5) continue;
    const avg = agg.sum / agg.count;
    if (avg <= 8.5) continue;
    const cat = patternToCategory[pattern];
    const targetCourse = courses.find((c) => c.category === cat);
    if (!targetCourse) continue;
    const s = rpeFlagSignal({ skillId: targetCourse.id, pattern, avgRpe: avg, sampleSize: agg.count });
    if (s) signals.push(s);
  }

  // 3. Frequency gap — zero gymnastics work in 14d AND >=3 CrossFit workouts in 14d
  const last14 = new Date(); last14.setUTCDate(last14.getUTCDate() - 14);
  const last14Iso = last14.toISOString().slice(0, 10);
  const cfRows = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(workouts)
    .where(and(eq(workouts.classType, "CROSSFIT"), gte(workouts.date, last14Iso)));
  const crossfitCount = cfRows[0]?.cnt ?? 0;
  const gymRows = await db.execute(sql`
    SELECT COUNT(*) AS cnt FROM wod_results
    JOIN workout_sections ON workout_sections.id = wod_results.section_id
    WHERE wod_results.user_id = ${userId}
      AND wod_results.created_at >= ${last14Iso}
      AND (workout_sections.wod_movements::text ~* '\\m(pull|muscle|handstand|toes to bar|ring)\\M')
  `);
  const gymCount = Number((gymRows as unknown as { rows: Array<{ cnt: number }> }).rows[0]?.cnt ?? 0);
  if (crossfitCount >= 3 && gymCount === 0) {
    const candidate = courses.find((c) => c.category === "gymnastics_pull");
    if (candidate) {
      const s = frequencyGapSignal({ skillId: candidate.id, gymnasticsCount14d: 0, crossfitCount14d: crossfitCount });
      if (s) signals.push(s);
    }
  }

  // 4. Failed completion — score_value matching "<done>/<total>" with done < total
  const failRows = await db
    .select({
      scoreValue: wodResults.scoreValue,
      sectionId: wodResults.sectionId,
    })
    .from(wodResults)
    .where(eq(wodResults.userId, userId));
  for (const row of failRows) {
    const m = row.scoreValue.match(/^(\d+)\/(\d+)$/);
    if (!m) continue;
    const done = parseInt(m[1], 10);
    const total = parseInt(m[2], 10);
    if (done >= total || total === 0) continue;
    const [section] = await db.select({ wodName: workoutSections.wodName, movements: workoutSections.wodMovements }).from(workoutSections).where(eq(workoutSections.id, row.sectionId));
    if (!section || !section.movements) continue;
    const movementBlob = JSON.stringify(section.movements).toLowerCase();
    for (const c of courses) {
      if (!movementBlob.includes(c.name.toLowerCase().split(" ")[0])) continue;
      const s = failedCompletionSignal({
        skillId: c.id,
        wodName: section.wodName ?? "WOD",
        movement: c.name,
        roundsCompleted: done,
        prescribedRounds: total,
      });
      if (s) signals.push(s);
      break;
    }
  }

  return rankSignals(signals).slice(0, 5);
}
