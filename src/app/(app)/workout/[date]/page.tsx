import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  getWorkoutByDate,
  getUserMaxForLift,
  getEstimated1RM,
  getLastLoggedWeights,
  getExerciseHistory,
  getWodResult,
  getUserProfile,
} from "@/app/actions";
import { SectionDisplay } from "@/components/section-display";
import { Barbell1RMSection } from "@/components/barbell-1rm-section";
import { EstimatedOneRMBanner } from "@/components/estimated-1rm-banner";
import { ExerciseHistorySection } from "@/components/exercise-history";
import { WarmupCalculator } from "@/components/warmup-calculator";
import { WodScoreEntry } from "@/components/wod-score-entry";
import { LogExerciseInline } from "@/components/log-exercise-inline";
import { calculateWeight } from "@/lib/percentage";
import Link from "next/link";

import type { ClassType, WodScoreType, RxLevel } from "@/db/schema";

interface Props {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ class?: string; week?: string }>;
}

export default async function WorkoutDetailPage({ params, searchParams }: Props) {
  const { date } = await params;
  const sp = await searchParams;
  const classType = (sp.class as ClassType) || "BARBELL";
  const weekParam = sp.week || null;
  const workout = await getWorkoutByDate(date, classType);

  if (!workout) notFound();

  const backParams = new URLSearchParams();
  backParams.set("class", classType);
  if (weekParam) backParams.set("week", weekParam);
  const backHref = `/schedule?${backParams.toString()}`;

  const isBarbell = classType === "BARBELL";

  if (isBarbell) {
    return <BarbellDetail workout={workout} date={date} classType={classType} backHref={backHref} />;
  }
  return <CrossFitDetail workout={workout} date={date} classType={classType} backHref={backHref} />;
}

async function BarbellDetail({
  workout,
  date,
  classType,
  backHref,
}: {
  workout: Awaited<ReturnType<typeof getWorkoutByDate>> & {};
  date: string;
  classType: ClassType;
  backHref: string;
}) {
  const olympicSection = workout.sections.find(
    (s) => s.type === "OLYMPIC LIFT"
  );
  const liftName = olympicSection?.liftName;

  const strengthExerciseNames = workout.sections
    .filter((s) => s.type.startsWith("STRENGTH") || s.type === "ACCESSORY")
    .flatMap((s) => s.exercises.map((e) => (e as { name: string }).name));

  const allLoggableNames = [
    ...(liftName ? [liftName] : []),
    ...strengthExerciseNames,
  ];

  const [userMax, estimated1RM, previousWeights, exerciseHistory] = await Promise.all([
    liftName ? getUserMaxForLift(liftName) : null,
    liftName ? getEstimated1RM(liftName) : null,
    getLastLoggedWeights(strengthExerciseNames),
    getExerciseHistory(allLoggableNames, 10),
  ]);

  const STALE_THRESHOLD_MS = 4 * 7 * 24 * 60 * 60 * 1000;
  const isStale = userMax
    ? Date.now() - new Date(userMax.updatedAt).getTime() > STALE_THRESHOLD_MS
    : false;
  const showEstimateBanner =
    estimated1RM &&
    (!userMax || (isStale && estimated1RM.estimatedMax > userMax.maxWeight));

  return (
    <div className="flex flex-col gap-8">
      <Link
        href={backHref}
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

      {liftName && !showEstimateBanner && (
        <Barbell1RMSection
          liftName={liftName}
          currentMax={userMax?.maxWeight}
          unit={userMax?.unit ?? "kg"}
        />
      )}

      {showEstimateBanner && estimated1RM && (
        <EstimatedOneRMBanner
          liftName={liftName!}
          estimatedMax={estimated1RM.estimatedMax}
          basedOn={estimated1RM.basedOn}
          variant={userMax ? "stale" : "no-max"}
          currentMax={userMax?.maxWeight}
          currentMaxDate={userMax?.updatedAt ? new Date(userMax.updatedAt) : undefined}
          unit={userMax?.unit ?? "kg"}
        />
      )}

      {userMax && olympicSection?.exercises?.[0]?.percentageSets && (() => {
        const pSets = olympicSection.exercises[0].percentageSets!;
        const maxPct = Math.max(...pSets.map((ps) => ps.percentage));
        const workingWeight = calculateWeight(userMax.maxWeight, maxPct);
        return (
          <WarmupCalculator workingWeight={workingWeight} unit={userMax.unit} />
        );
      })()}

      <div className="flex flex-col gap-6">
        {workout.sections.map((section, i) => (
          <SectionDisplay
            key={i}
            section={section}
            userMax={section.type === "OLYMPIC LIFT" ? userMax : undefined}
            date={date}
            workoutId={workout.id}
            previousWeights={previousWeights}
          />
        ))}
      </div>

      <ExerciseHistorySection history={exerciseHistory} />
    </div>
  );
}

async function CrossFitDetail({
  workout,
  date,
  classType,
  backHref,
}: {
  workout: Awaited<ReturnType<typeof getWorkoutByDate>> & {};
  date: string;
  classType: ClassType;
  backHref: string;
}) {
  const wodSection = workout.sections.find((s) => s.type === "WOD");

  const [wodResult, profile] = await Promise.all([
    wodSection ? getWodResult(wodSection.id) : null,
    getUserProfile(),
  ]);

  const strengthSections = workout.sections.filter(
    (s) => s.type === "STRENGTH" || s.type === "HEAVY DAY" || s.type === "LOADING UP"
  );
  const strengthNames = strengthSections.flatMap((s) =>
    s.exercises.map((e) => (e as { name: string }).name)
  );
  const previousWeights = strengthNames.length > 0 ? await getLastLoggedWeights(strengthNames) : {};

  return (
    <div className="flex flex-col gap-8">
      <Link
        href={backHref}
        className="flex items-center gap-1 font-label text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant hover:text-white"
      >
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        SCHEDULE
      </Link>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-headline text-4xl font-black uppercase tracking-tighter">
            {wodSection?.wodName || workout.title}
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

      <div className="flex flex-col gap-6">
        {workout.sections.map((section) => {
          const isWod = section.type === "WOD";
          const isOnRamp = section.type === "ON RAMP";
          const isStrength = section.type === "STRENGTH" || section.type === "HEAVY DAY" || section.type === "LOADING UP";

          return (
            <div key={section.id} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${
                    isWod
                      ? "bg-red-500/20 text-red-400"
                      : isOnRamp
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-surface-container-highest text-on-surface-variant"
                  }`}
                >
                  {section.type}
                </span>
                {section.sets && (
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                    {section.sets}
                  </span>
                )}
                {isWod && section.timeCap && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
                    CAP {Math.floor(section.timeCap / 60)}:{String(section.timeCap % 60).padStart(2, "0")}
                  </span>
                )}
                {isWod && section.rxWeights && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
                    RX {section.rxWeights}kg
                  </span>
                )}
              </div>

              {section.wodName && (
                <p className="font-headline text-lg font-bold uppercase tracking-tight text-primary">
                  {section.wodName}
                </p>
              )}

              {isStrength && section.exercises.length > 1 ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      {section.exercises.map((exercise, i) => (
                        <span key={i} className="font-bold text-on-surface">
                          {exercise.name}
                        </span>
                      ))}
                    </div>
                    <LogExerciseInline
                      date={date}
                      workoutId={workout.id}
                      exerciseName={section.exercises.map((e) => e.name).join(" + ")}
                      lastWeight={previousWeights[section.exercises.map((e) => e.name).join(" + ")]?.weight}
                      lastReps={previousWeights[section.exercises.map((e) => e.name).join(" + ")]?.reps ?? undefined}
                      sectionType={section.type}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {section.exercises.map((exercise, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <span className="font-bold text-on-surface">
                        {exercise.name}
                      </span>
                      {isStrength && (
                        <LogExerciseInline
                          date={date}
                          workoutId={workout.id}
                          exerciseName={exercise.name}
                          lastWeight={previousWeights[exercise.name]?.weight}
                          lastReps={previousWeights[exercise.name]?.reps ?? undefined}
                          sectionType={section.type}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {isWod && section.wodScoreType && (
                <WodScoreEntry
                  workoutId={workout.id}
                  sectionId={section.id}
                  scoreType={section.wodScoreType as WodScoreType}
                  timeCap={section.timeCap}
                  rxWeights={section.rxWeights}
                  wodName={section.wodName}
                  userSex={profile?.sex as "male" | "female" | null}
                  existingScore={wodResult ? { scoreValue: wodResult.scoreValue, rxLevel: wodResult.rxLevel as RxLevel } : null}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
