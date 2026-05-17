import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "./index";
import { skillCourses, skillDrills, type SkillDrillSection } from "./schema";
import { sql } from "drizzle-orm";
import { CURATION } from "../../data/skill-library/curation";
import { classifyMovements } from "../lib/programming/movement-patterns";

interface ScrapedWorkoutItem {
  movement: string;
  sets?: number;
  reps?: string | number;
  minute?: number;
  notes?: string;
  has_video?: boolean;
}

interface ScrapedWorkoutSection {
  name: string;
  items: ScrapedWorkoutItem[];
}

interface ScrapedWorkout {
  id: string;
  lesson_id?: number;
  title: string;
  url?: string;
  description?: string;
  sections: ScrapedWorkoutSection[];
}

interface ScrapedWeek {
  week: number;
  workouts: ScrapedWorkout[];
}

interface ScrapedCourse {
  skill: string;
  course_name: string;
  course_slug: string;
  source: string;
  source_url: string;
  scraped: string;
  total_weeks: number;
  weeks: ScrapedWeek[];
}

const SKILL_LIBRARY_DIR = path.join(process.cwd(), "data", "skill-library");

async function loadCourses(): Promise<ScrapedCourse[]> {
  const files = await readdir(SKILL_LIBRARY_DIR);
  const jsonFiles = files.filter((f) => f.endsWith(".json") && !f.endsWith("-raw.json"));
  const out: ScrapedCourse[] = [];
  for (const f of jsonFiles) {
    const raw = await readFile(path.join(SKILL_LIBRARY_DIR, f), "utf-8");
    out.push(JSON.parse(raw));
  }
  return out;
}

function movementsSummaryFor(workout: ScrapedWorkout): string {
  const top: string[] = [];
  for (const section of workout.sections) {
    for (const item of section.items) {
      if (item.movement) top.push(item.movement);
      if (top.length >= 5) return top.join(" · ");
    }
  }
  return top.join(" · ");
}

function allMovementsIn(workout: ScrapedWorkout): string[] {
  const out: string[] = [];
  for (const section of workout.sections) {
    for (const item of section.items) if (item.movement) out.push(item.movement);
  }
  return out;
}

async function main() {
  const courses = await loadCourses();
  console.log(`Loaded ${courses.length} courses from ${SKILL_LIBRARY_DIR}`);

  for (const c of courses) {
    const curation = CURATION[c.course_slug];
    if (!curation) {
      console.warn(`  ⚠ skipping ${c.course_slug} — no curation entry`);
      continue;
    }

    // Upsert course
    const [course] = await db
      .insert(skillCourses)
      .values({
        slug: c.course_slug,
        name: c.course_name,
        source: c.source,
        sourceUrl: c.source_url,
        totalWeeks: c.total_weeks,
        category: curation.category,
        difficulty: curation.difficulty,
        estimatedSessionMinutes: curation.estimatedSessionMinutes,
        drillsPerWeek: curation.drillsPerWeek,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: skillCourses.slug,
        set: {
          name: c.course_name,
          totalWeeks: c.total_weeks,
          category: curation.category,
          difficulty: curation.difficulty,
          estimatedSessionMinutes: curation.estimatedSessionMinutes,
          drillsPerWeek: curation.drillsPerWeek,
          updatedAt: new Date(),
        },
      })
      .returning();

    let drillCount = 0;
    for (const week of c.weeks) {
      let order = 0;
      for (const workout of week.workouts) {
        order += 1;
        const movements = allMovementsIn(workout);
        await db
          .insert(skillDrills)
          .values({
            courseId: course.id,
            week: week.week,
            orderInWeek: order,
            externalId: workout.id,
            title: workout.title,
            sections: workout.sections as SkillDrillSection[],
            movementsSummary: movementsSummaryFor(workout),
            primaryMovementPatterns: classifyMovements(movements),
          })
          .onConflictDoUpdate({
            target: [skillDrills.courseId, skillDrills.externalId],
            set: {
              title: workout.title,
              sections: workout.sections as SkillDrillSection[],
              movementsSummary: movementsSummaryFor(workout),
              primaryMovementPatterns: classifyMovements(movements),
              week: week.week,
              orderInWeek: order,
            },
          });
        drillCount += 1;
      }
    }

    console.log(`  ✓ ${c.course_slug} — ${drillCount} drills`);
  }

  // Resolve prerequisites in a second pass (slugs → ids)
  for (const [slug, entry] of Object.entries(CURATION)) {
    if (!entry.prerequisiteSlug) continue;
    await db.execute(sql`
      UPDATE skill_courses
      SET prerequisite_skill_id = (SELECT id FROM skill_courses WHERE slug = ${entry.prerequisiteSlug})
      WHERE slug = ${slug}
    `);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
