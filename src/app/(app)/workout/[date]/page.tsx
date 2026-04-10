import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import { getWorkoutByDate, getUserMaxForLift, getLiftHistory } from "@/app/actions";
import { SectionDisplay } from "@/components/section-display";
import { MaxEntryForm } from "@/components/max-entry-form";
import { LogWeightModal } from "@/components/log-weight-modal";
import Link from "next/link";

interface Props {
  params: Promise<{ date: string }>;
}

export default async function WorkoutDetailPage({ params }: Props) {
  const { date } = await params;
  const workout = await getWorkoutByDate(date);

  if (!workout) notFound();

  const olympicSection = workout.sections.find(
    (s) => s.type === "OLYMPIC LIFT"
  );
  const liftName = olympicSection?.liftName;
  const userMax = liftName ? await getUserMaxForLift(liftName) : null;
  const recentLogs = liftName ? await getLiftHistory(liftName) : [];

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/schedule"
        className="flex items-center gap-1 font-label text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant hover:text-white"
      >
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        SCHEDULE
      </Link>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-headline text-4xl font-black uppercase tracking-tighter">
            {liftName || workout.title}
          </h2>
          <span className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
            {format(parseISO(workout.date), "EEEE").toUpperCase()}
          </span>
        </div>
        <div className="h-[2px] w-12 bg-primary-container" />
        <p className="mt-2 font-label text-xs tracking-widest text-on-surface-variant">
          {format(parseISO(workout.date), "d MMMM yyyy").toUpperCase()}
        </p>
      </section>

      {liftName && (
        <div className="bg-surface-container-high p-6">
          <p className="mb-3 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            YOUR 1RM — {liftName.toUpperCase()}
          </p>
          {userMax ? (
            <div className="mb-4 flex items-baseline gap-2">
              <span className="font-headline text-5xl font-black text-primary-container">
                {userMax.maxWeight}
              </span>
              <span className="font-bold uppercase tracking-tighter text-on-surface-variant">
                {userMax.unit}
              </span>
            </div>
          ) : null}
          <MaxEntryForm
            liftName={liftName}
            currentMax={userMax?.maxWeight}
          />
        </div>
      )}

      <div className="flex flex-col gap-6">
        {workout.sections.map((section, i) => (
          <SectionDisplay
            key={i}
            section={section}
            userMax={section.type === "OLYMPIC LIFT" ? userMax : undefined}
          />
        ))}
      </div>

      <div className="bg-surface-container-high p-6">
        <p className="mb-4 font-headline text-sm font-bold uppercase tracking-widest">
          LOG A LIFT
        </p>
        <LogWeightModal
          date={date}
          workoutId={workout.id}
          defaultLiftName={liftName ?? undefined}
        />
      </div>

      {recentLogs.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between border-b border-outline-variant/20 pb-2">
            <h3 className="font-headline text-sm font-bold uppercase tracking-widest">
              PREVIOUS LOGS
            </h3>
            <span className="font-label text-[10px] text-on-surface-variant">
              {liftName?.toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col gap-px">
            {recentLogs.slice(0, 5).map((log, i) => (
              <div
                key={log.id}
                className="flex items-center justify-between bg-surface-container p-4 transition-colors hover:bg-surface-container-high"
              >
                <div className="flex items-center gap-6">
                  <span className="font-headline text-2xl font-black text-outline">
                    {String(recentLogs.length - i).padStart(2, "0")}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-headline text-lg font-bold">
                      {log.weight} {log.unit}
                      {log.reps && (
                        <span className="mx-1 text-on-surface-variant">
                          x
                        </span>
                      )}
                      {log.reps && <span>{log.reps}</span>}
                    </span>
                    <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                      {format(parseISO(log.date), "d MMM yyyy")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
