import { Suspense } from "react";
import { format, addDays, startOfWeek, isToday, parseISO, isSunday, getDay } from "date-fns";
import { getWorkoutsForWeek, getPersonalSummaryForWorkouts, getUserProfile, getStreakData } from "@/app/actions";
import { WeekNav } from "@/components/week-nav";
import { DaySelector } from "@/components/day-selector";
import { ClassTypeTabs } from "@/components/class-type-tabs";
import { OnboardingTour } from "@/components/onboarding-tour";
import { SwipeDayNav } from "@/components/swipe-day-nav";
import type { ClassType } from "@/db/schema";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ week?: string; day?: string; class?: string }>;
}

export default async function SchedulePage({ searchParams }: Props) {
  const params = await searchParams;
  const classType = (params.class as ClassType) || "BARBELL";

  const now = new Date();
  const autoAdvance = !params.week && isSunday(now);

  const weekStart = params.week
    ? new Date(params.week + "T00:00:00")
    : autoAdvance
      ? addDays(startOfWeek(now, { weekStartsOn: 1 }), 7)
      : startOfWeek(now, { weekStartsOn: 1 });

  const weekEnd = addDays(weekStart, 5);
  const startStr = format(weekStart, "yyyy-MM-dd");
  const endStr = format(weekEnd, "yyyy-MM-dd");

  const workouts = await getWorkoutsForWeek(startStr, endStr, classType);
  const isBarbell = classType === "BARBELL";

  const workoutLifts = isBarbell
    ? workouts.map((w) => {
        const olympicLift = w.sections.find((s) => s.type === "OLYMPIC LIFT")?.liftName ?? undefined;
        const strengthExercises = w.sections
          .filter((s) => s.type.startsWith("STRENGTH") || s.type === "ACCESSORY")
          .flatMap((s) => s.exercises.map((e) => e.name));
        return { olympicLift, strengthExercises };
      })
    : [];

  const [{ maxes, lastWeights, lastOlympicLogs }, profile, streak] = await Promise.all([
    isBarbell
      ? getPersonalSummaryForWorkouts(workoutLifts)
      : Promise.resolve({
          maxes: {} as Record<string, { maxWeight: number; unit: string }>,
          lastWeights: {} as Record<string, { weight: number; reps: number | null; unit: string }>,
          lastOlympicLogs: {} as Record<string, { weight: number; reps: number | null; unit: string; date: string }>,
        }),
    getUserProfile(),
    getStreakData(),
  ]);

  const displayName = profile?.displayName || null;

  const weekParam = params.week || null;

  const weekDays = Array.from({ length: 6 }, (_, i) => {
    const date = addDays(weekStart, i);
    return {
      date: format(date, "yyyy-MM-dd"),
      label: format(date, "EEE d").toUpperCase(),
      isToday: isToday(date),
    };
  });

  const todayDay = weekDays.find((d) => d.isToday);
  const selectedDay = params.day || todayDay?.date || weekDays[0].date;
  const selectedWorkout = workouts.find((w) => w.date === selectedDay);

  function workoutHref(workoutDate: string) {
    const qs = new URLSearchParams();
    qs.set("class", classType);
    if (weekParam) qs.set("week", weekParam);
    return `/workout/${workoutDate}?${qs.toString()}`;
  }

  function getWorkoutSummaryChips(workout: (typeof workouts)[number]) {
    const chips: { label: string; value: string }[] = [];

    const olympicLift = workout.sections.find((s) => s.type === "OLYMPIC LIFT")?.liftName;
    if (olympicLift && maxes[olympicLift]) {
      chips.push({
        label: "1RM",
        value: `${maxes[olympicLift].maxWeight}${maxes[olympicLift].unit}`,
      });
    }
    if (olympicLift && lastOlympicLogs[olympicLift]) {
      const log = lastOlympicLogs[olympicLift];
      chips.push({
        label: "LAST",
        value: `${log.weight}${log.unit}${log.reps ? ` x${log.reps}` : ""}`,
      });
    }

    const strengthNames = workout.sections
      .filter((s) => s.type.startsWith("STRENGTH"))
      .flatMap((s) => s.exercises.map((e) => e.name));

    for (const name of strengthNames) {
      if (lastWeights[name]) {
        const shortName = name.replace(/^\d+\s*/, "").split(" ").slice(0, 2).join(" ");
        chips.push({
          label: shortName.toUpperCase(),
          value: `${lastWeights[name].weight}${lastWeights[name].unit}${lastWeights[name].reps ? ` x${lastWeights[name].reps}` : ""}`,
        });
      }
    }

    return chips.slice(0, 4);
  }

  function getWorkoutHeadline(workout: (typeof workouts)[number]) {
    if (isBarbell) {
      return workout.sections.find((s) => s.type === "OLYMPIC LIFT")?.liftName || workout.title;
    }
    const wod = workout.sections.find((s) => s.type === "WOD");
    return wod?.wodName || workout.title;
  }

  function getWorkoutBadge(workout: (typeof workouts)[number]) {
    if (isBarbell) return "WOD";
    const wod = workout.sections.find((s) => s.type === "WOD");
    if (wod?.wodScoreType === "TIME") return "FOR TIME";
    if (wod?.wodScoreType === "ROUNDS_REPS") return "AMRAP";
    if (wod?.wodScoreType === "INTERVAL") return "INTERVAL";
    return "WOD";
  }

  const showOnboarding = !profile?.onboardingComplete;

  return (
    <div className="flex flex-col gap-8">
      {showOnboarding && <OnboardingTour />}

      <section className="mb-2">
        <p className="mb-2 font-label text-xs uppercase tracking-[0.2em] text-primary">
          {isBarbell ? "BARBELL PERFORMANCE TRACKER" : "CROSSFIT TRACKER"}
        </p>
        <div className="flex items-baseline justify-between">
          <h2 className="font-headline text-4xl font-bold uppercase tracking-tighter sm:text-5xl">
            WELCOME BACK,
            <br />
            {displayName?.toUpperCase() || "COMMANDER"}
          </h2>
          <Suspense>
            <WeekNav />
          </Suspense>
        </div>
      </section>

      {streak.totalSessions > 0 && (
        <div className="flex gap-3 overflow-x-auto">
          <div className="flex flex-1 items-center gap-3 bg-surface-container-high px-4 py-3">
            <span
              className="material-symbols-outlined text-2xl text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              local_fire_department
            </span>
            <div>
              <p className="font-headline text-lg font-black leading-none">
                {streak.currentStreak}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                {streak.currentStreak === 1 ? "WEEK STREAK" : "WEEK STREAK"}
              </p>
            </div>
          </div>
          <div className="flex flex-1 items-center gap-3 bg-surface-container-high px-4 py-3">
            <span className="material-symbols-outlined text-2xl text-on-surface-variant">
              calendar_month
            </span>
            <div>
              <p className="font-headline text-lg font-black leading-none">
                {streak.sessionsThisMonth}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                THIS MONTH
              </p>
            </div>
          </div>
          <div className="flex flex-1 items-center gap-3 bg-surface-container-high px-4 py-3">
            <span
              className="material-symbols-outlined text-2xl text-primary-container"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              emoji_events
            </span>
            <div>
              <p className="font-headline text-lg font-black leading-none">
                {streak.longestStreak}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                BEST STREAK
              </p>
            </div>
          </div>
        </div>
      )}

      <Link
        href="/leaderboard"
        className="flex items-center justify-between bg-surface-container px-5 py-3 transition-colors hover:bg-surface-container-high"
      >
        <div className="flex items-center gap-3">
          <span
            className="material-symbols-outlined text-xl text-primary-container"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            emoji_events
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            LEADERBOARD
          </span>
        </div>
        <span className="material-symbols-outlined text-sm text-outline">
          chevron_right
        </span>
      </Link>

      <Suspense>
        <ClassTypeTabs selected={classType} />
      </Suspense>

      <Suspense>
        <DaySelector days={weekDays} selectedDay={selectedDay} />
      </Suspense>

      <SwipeDayNav days={weekDays.map((d) => d.date)} selectedDay={selectedDay}>
      {selectedWorkout ? (
        <div className="flex flex-col gap-4">
          <Link href={workoutHref(selectedWorkout.date)} data-tour="workout-card">
            <div className="bg-surface-container-high p-8 transition-colors hover:bg-surface-bright">
              <div className="mb-6 flex items-center gap-3">
                <span className="bg-primary-container px-3 py-1 font-headline text-sm font-bold text-on-primary-fixed">
                  {getWorkoutBadge(selectedWorkout)}
                </span>
                <span className="font-label text-xs tracking-widest text-on-surface-variant">
                  {format(parseISO(selectedWorkout.date), "EEEE, MMM d").toUpperCase()}
                </span>
              </div>

              <h3 className="mb-4 font-headline text-3xl font-bold uppercase tracking-tight">
                {getWorkoutHeadline(selectedWorkout)}
              </h3>

              {isBarbell && (() => {
                const chips = getWorkoutSummaryChips(selectedWorkout);
                if (chips.length === 0) return null;
                return (
                  <div className="mb-6 flex flex-wrap gap-2">
                    {chips.map((chip, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1.5 bg-surface-container px-3 py-1.5"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                          {chip.label}
                        </span>
                        <span className="font-headline text-sm font-bold text-primary-container">
                          {chip.value}
                        </span>
                      </span>
                    ))}
                  </div>
                );
              })()}

              {!isBarbell && (() => {
                const wod = selectedWorkout.sections.find((s) => s.type === "WOD");
                if (!wod) return null;
                return (
                  <div className="mb-6 flex flex-wrap gap-2">
                    {wod.timeCap && (
                      <span className="flex items-center gap-1.5 bg-surface-container px-3 py-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                          TIME CAP
                        </span>
                        <span className="font-headline text-sm font-bold text-primary-container">
                          {Math.floor(wod.timeCap / 60)}:{String(wod.timeCap % 60).padStart(2, "0")}
                        </span>
                      </span>
                    )}
                    {wod.rxWeights && (
                      <span className="flex items-center gap-1.5 bg-surface-container px-3 py-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                          RX
                        </span>
                        <span className="font-headline text-sm font-bold text-primary-container">
                          {wod.rxWeights}kg
                        </span>
                      </span>
                    )}
                  </div>
                );
              })()}

              <div className="mb-8 space-y-3">
                {selectedWorkout.sections.map((section, i) => (
                  <div key={i} className="border-b border-outline-variant/20 pb-3">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                      {section.type}
                    </span>
                    {section.liftName ? (
                      <span className="font-headline font-bold uppercase text-on-surface">
                        {section.liftName}
                      </span>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {section.exercises.map((ex, j) => (
                          <span key={j} className="text-sm text-on-surface">
                            {ex.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button className="digital-texture w-full py-4 font-headline font-black uppercase tracking-widest text-on-primary-fixed transition-transform duration-150 active:scale-95">
                GO TO WORKOUT
              </button>
            </div>
          </Link>

        </div>
      ) : (
        <div className="bg-surface-container-high p-12 text-center">
          <p className="font-headline text-xl font-bold uppercase tracking-tight text-on-surface-variant">
            REST DAY
          </p>
          <p className="mt-2 font-label text-xs tracking-widest text-outline">
            NO WORKOUT PROGRAMMED FOR THIS DAY
          </p>
          {workouts.length === 0 && (
            <p className="mt-4 font-label text-xs tracking-widest text-primary">
              SWIPE OR TAP THE ARROWS TO CHECK OTHER WEEKS
            </p>
          )}
        </div>
      )}
      </SwipeDayNav>
    </div>
  );
}
