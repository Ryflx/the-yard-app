import { notFound } from "next/navigation";
import { db } from "@/db";
import { skillCourses, skillDrills } from "@/db/schema";
import { eq } from "drizzle-orm";

interface Params { slug: string }

export default async function SkillCoursePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const [course] = await db.select().from(skillCourses).where(eq(skillCourses.slug, slug));
  if (!course) notFound();
  const drills = await db
    .select()
    .from(skillDrills)
    .where(eq(skillDrills.courseId, course.id))
    .orderBy(skillDrills.week, skillDrills.orderInWeek);

  return (
    <div className="px-4 py-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-on-surface-variant">{course.category.replace(/_/g, " ")}</p>
      <h1 className="mt-1 font-headline text-2xl font-black uppercase tracking-tight">{course.name}</h1>
      <p className="mt-2 text-xs text-on-surface-variant">
        {course.totalWeeks} weeks · difficulty {course.difficulty}/5 · ~{course.estimatedSessionMinutes}min/session
      </p>

      <ul className="mt-6 space-y-2">
        {drills.map((d) => (
          <li key={d.id} className="border-b border-outline-variant py-2">
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">WEEK {d.week}</p>
            <p className="text-sm">{d.title}</p>
            <p className="text-xs text-on-surface-variant">{d.movementsSummary}</p>
          </li>
        ))}
      </ul>

      <a
        href={course.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface"
      >
        Open on WODprep →
      </a>
    </div>
  );
}
