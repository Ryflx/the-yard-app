import type { workouts, workoutSections, customPlanSessions, skillDrills, skillCourses, wodResults } from "@/db/schema";
import type { WodScoreType } from "@/db/schema";
import type { Sex } from "@/lib/strength-standards";
import { WodScoreEntry } from "@/components/wod-score-entry";
import { SwapDrillSheet } from "@/components/programming/swap-drill-sheet";
import { formatDrillTitle } from "@/lib/programming/format";
import type { MaxAttempt } from "@/app/actions";
import { format, parseISO, differenceInDays } from "date-fns";
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
  maxTests?: string[];
  maxAttemptsByMovement?: Record<string, MaxAttempt[]>;
}

function describeAttemptAge(d: Date): string {
  const days = differenceInDays(new Date(), d);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  const weeks = Math.round(days / 7);
  return `${weeks} weeks ago`;
}

export function CustomDrillDetail({
  workout,
  sections,
  session,
  drill,
  course,
  userSex,
  existingScoreBySectionId,
  maxTests,
  maxAttemptsByMovement,
}: Props) {
  const hasMaxTests = (maxTests?.length ?? 0) > 0;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
          <Link href={`/programming/skills/${course.slug}`} className="hover:text-on-surface">
            {course.name}
          </Link>
          {" · "}Week {drill.week}, Workout {drill.orderInWeek}
        </p>
        <h2 className="mt-1 font-headline text-2xl font-black uppercase tracking-tight">{formatDrillTitle(drill.title)}</h2>
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

      {hasMaxTests && (
        <div className="border-l-2 border-primary-container bg-surface-container px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary-container">
            MAX test · record reps per set
          </p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Type your reps for each set into the notes field, e.g. <code className="bg-surface-container-high px-1">10 / 8 / 6</code>.
          </p>
          {maxTests!.map((movement) => {
            const attempts = maxAttemptsByMovement?.[movement] ?? [];
            return (
              <div key={movement} className="mt-3">
                <p className="text-xs font-semibold text-on-surface">{movement}</p>
                {attempts.length === 0 ? (
                  <p className="mt-0.5 text-[11px] text-on-surface-variant">No previous attempts logged.</p>
                ) : (
                  <ul className="mt-1 space-y-0.5">
                    {attempts.map((a, i) => (
                      <li key={i} className="text-[11px] text-on-surface-variant">
                        {format(parseISO(a.date), "MMM d")} ({describeAttemptAge(a.createdAt)}) —{" "}
                        <span className="text-on-surface">{a.notes?.trim() || a.scoreValue || "(no notes)"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

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
      </div>
    </div>
  );
}
