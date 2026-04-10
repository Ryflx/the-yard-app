import { Suspense } from "react";
import { format, addDays, startOfWeek, isToday, parseISO } from "date-fns";
import { getWorkoutsForWeek } from "@/app/actions";
import { WeekNav } from "@/components/week-nav";
import { DaySelector } from "@/components/day-selector";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ week?: string; day?: string }>;
}

export default async function SchedulePage({ searchParams }: Props) {
  const params = await searchParams;
  const weekStart = params.week
    ? new Date(params.week + "T00:00:00")
    : startOfWeek(new Date(), { weekStartsOn: 1 });

  const weekEnd = addDays(weekStart, 4);
  const startStr = format(weekStart, "yyyy-MM-dd");
  const endStr = format(weekEnd, "yyyy-MM-dd");

  const workouts = await getWorkoutsForWeek(startStr, endStr);

  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const date = addDays(weekStart, i);
    return {
      date: format(date, "yyyy-MM-dd"),
      label: format(date, "EEE d").toUpperCase(),
      isToday: isToday(date),
    };
  });

  const selectedDay = params.day || weekDays.find((d) => d.isToday)?.date || weekDays[0].date;
  const selectedWorkout = workouts.find((w) => w.date === selectedDay);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="mb-2 font-label text-xs uppercase tracking-[0.2em] text-primary">
          WEEKLY PROGRAMMING
        </p>
        <div className="flex items-baseline justify-between">
          <h2 className="font-headline text-4xl font-bold uppercase tracking-tighter">
            SCHEDULE
          </h2>
          <Suspense>
            <WeekNav />
          </Suspense>
        </div>
      </section>

      <Suspense>
        <DaySelector days={weekDays} selectedDay={selectedDay} />
      </Suspense>

      {selectedWorkout ? (
        <div className="flex flex-col gap-4">
          <Link href={`/workout/${selectedWorkout.date}`}>
            <div className="bg-surface-container-high p-8 transition-colors hover:bg-surface-bright">
              <div className="mb-6 flex items-center gap-3">
                <span className="bg-primary-container px-3 py-1 font-headline text-sm font-bold text-on-primary-fixed">
                  WOD
                </span>
                <span className="font-label text-xs tracking-widest text-on-surface-variant">
                  {format(parseISO(selectedWorkout.date), "EEEE, MMM d").toUpperCase()}
                </span>
              </div>

              {selectedWorkout.sections
                .filter((s) => s.type === "OLYMPIC LIFT")
                .map((section, i) => (
                  <h3
                    key={i}
                    className="mb-4 font-headline text-3xl font-bold uppercase tracking-tight"
                  >
                    {section.liftName || section.type}
                  </h3>
                ))}

              <div className="mb-8 space-y-4">
                {selectedWorkout.sections.map((section, i) => (
                  <div
                    key={i}
                    className="flex items-end justify-between border-b border-outline-variant/20 pb-2"
                  >
                    <span className="font-bold uppercase text-on-surface">
                      {section.type}
                    </span>
                    <span className="font-headline text-sm text-primary">
                      {section.sets || `${section.exercises.length} exercises`}
                    </span>
                  </div>
                ))}
              </div>

              <button className="digital-texture w-full py-4 font-headline font-black uppercase tracking-widest text-on-primary-fixed transition-transform duration-150 active:scale-95">
                VIEW FULL WORKOUT
              </button>
            </div>
          </Link>

          {workouts
            .filter((w) => w.date !== selectedDay)
            .map((workout) => (
              <Link key={workout.id} href={`/workout/${workout.date}`}>
                <div className="group bg-surface-container-low p-6 transition-all hover:bg-surface-container-high">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                        {format(parseISO(workout.date), "EEEE, MMM d").toUpperCase()}
                      </p>
                      <h3 className="font-headline text-xl font-bold uppercase tracking-tight text-white group-hover:text-primary-container">
                        {workout.sections.find((s) => s.type === "OLYMPIC LIFT")?.liftName ||
                          workout.title}
                      </h3>
                    </div>
                    <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary-container">
                      fitness_center
                    </span>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      ) : (
        <div className="bg-surface-container-high p-12 text-center">
          <p className="font-headline text-xl font-bold uppercase tracking-tight text-on-surface-variant">
            NO WORKOUT PROGRAMMED
          </p>
          <p className="mt-2 font-label text-xs tracking-widest text-outline">
            CHECK ANOTHER DAY OR ADD VIA ADMIN
          </p>
        </div>
      )}
    </div>
  );
}
