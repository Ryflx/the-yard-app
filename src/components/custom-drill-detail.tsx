import type { workouts, workoutSections, customPlanSessions, skillDrills, skillCourses, wodResults } from "@/db/schema";
import type { WodScoreType } from "@/db/schema";
import type { Sex } from "@/lib/strength-standards";
import { WodScoreEntry } from "@/components/wod-score-entry";
import { SwapDrillSheet } from "@/components/programming/swap-drill-sheet";
import Link from "next/link";

type Workout = typeof workouts.$inferSelect;
type Section = typeof workoutSections.$inferSelect;
type Session = typeof customPlanSessions.$inferSelect;
type Drill = typeof skillDrills.$inferSelect;
type Course = typeof skillCourses.$inferSelect;
type WodResult = typeof wodResults.$inferSelect;

interface Props {
  workout: Workout;
  sections: Section[];
  session: Session;
  drill: Drill;
  course: Course;
  userSex?: Sex;
  existingScoreBySectionId?: Map<number, WodResult>;
}

export function CustomDrillDetail({ workout, sections, session, drill, course, userSex, existingScoreBySectionId }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
          <Link href={`/programming/skills/${course.slug}`} className="hover:text-on-surface">
            {course.name}
          </Link>
          {" · "}Week {drill.week}, Workout {drill.orderInWeek}
        </p>
        <h2 className="mt-1 font-headline text-2xl font-black uppercase tracking-tight">{drill.title}</h2>
      </div>

      {session.llmRationale && (
        <div className="border-l-2 border-primary-container bg-surface-container px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary-container">Why this session</p>
          <p className="mt-1 text-sm text-on-surface-variant">{session.llmRationale}</p>
        </div>
      )}

      {drill.sections.map((s, i) => (
        <div key={i}>
          <h3 className="font-headline text-xs font-black uppercase tracking-widest text-on-surface-variant">
            {s.name}
          </h3>
          <ul className="mt-2 space-y-1">
            {s.items.map((it, j) => (
              <li key={j} className="text-sm text-on-surface">
                {it.movement}
                {it.reps != null && <span className="text-on-surface-variant"> × {String(it.reps)}</span>}
                {it.minute != null && <span className="text-on-surface-variant"> (min {it.minute})</span>}
                {it.notes && <span className="block text-xs text-on-surface-variant">{it.notes}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {sections
        .filter((s) => s.wodScoreType != null)
        .map((s) => (
          <WodScoreEntry
            key={s.id}
            workoutId={workout.id}
            sectionId={s.id}
            scoreType={s.wodScoreType as WodScoreType}
            timeCap={s.timeCap}
            rxWeights={s.rxWeights}
            wodName={s.wodName}
            wodSets={s.sets}
            userSex={userSex}
            existingScore={existingScoreBySectionId?.get(s.id)}
          />
        ))}

      <div className="flex items-center justify-between border-t border-outline-variant pt-4">
        <SwapDrillSheet sessionId={session.id} />
        <a
          href={course.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface"
        >
          Open on WODprep →
        </a>
      </div>
    </div>
  );
}
