import type { PercentageSet } from "@/db/schema";
import { calculateWeight, normalizeLiftName } from "@/lib/percentage";
import { parseSetsAndReps } from "@/lib/parse-sets";
import { LogExerciseInline } from "@/components/log-exercise-inline";
import { PercentageRow } from "@/components/percentage-row";
import { SubstitutableExerciseRow } from "@/components/substitutable-exercise-row";

interface PreviousWeight {
  weight: number;
  reps: number | null;
  repsText?: string | null;
  unit: string;
  prevWeight: number | null;
  prevReps: number | null;
  prevRepsText?: string | null;
}

interface SectionDisplayProps {
  section: {
    type: string;
    sets: string | null;
    liftName: string | null;
    exercises: {
      name: string;
      percentageSets?: PercentageSet[];
    }[];
  };
  userMax?: { maxWeight: number; unit: string; source: "manual" | "estimated" } | null;
  olympicLiftName?: string;
  date: string;
  workoutId: number;
  previousWeights?: Record<string, PreviousWeight>;
  loggedSetsToday?: Record<string, number>;
  substitutions?: Record<string, string[]>;
}

function parseDefaultReps(name: string): number | undefined {
  const match = name.match(/^(\d+)\s+/);
  return match ? parseInt(match[1]) : undefined;
}

export function SectionDisplay({ section, userMax, olympicLiftName, date, workoutId, previousWeights, loggedSetsToday, substitutions }: SectionDisplayProps) {
  const isOlympic = section.type === "OLYMPIC LIFT";
  const isLoggable =
    isOlympic ||
    section.type.startsWith("STRENGTH") ||
    section.type === "ACCESSORY";
  const { setCount: expectedSets, repsPerSet: sectionReps } = parseSetsAndReps(section.sets);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span
          className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${
            isOlympic
              ? "bg-primary-container text-on-primary-fixed"
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
      </div>

      {section.liftName && (
        <p className="font-headline text-lg font-bold uppercase tracking-tight text-primary">
          {section.liftName}
        </p>
      )}

      <div className="flex flex-col gap-1">
        {section.exercises.map((exercise, i) => (
          <div key={i}>
            {exercise.percentageSets ? (
              <div className="flex flex-col gap-px">
                {(() => {
                  let globalSetIdx = 0;
                  const loggedCount = section.liftName ? (loggedSetsToday?.[section.liftName] ?? 0) : 0;
                  return exercise.percentageSets!.flatMap((ps, j) => {
                  const multiMatch = ps.reps.match(/^(\d+)\s*x\s*(\d+)$/i);
                  const setCount = multiMatch ? parseInt(multiMatch[1]) : 1;
                  const repsPerSet = multiMatch ? parseInt(multiMatch[2]) : (parseInt(ps.reps) || 1);
                  const repsLabel = multiMatch ? multiMatch[2] : ps.reps;

                  return Array.from({ length: setCount }, (_, s) => {
                    const key = `${j}-${s}`;
                    const setIndex = globalSetIdx++;
                    const computedWeight = userMax
                      ? calculateWeight(userMax.maxWeight, ps.percentage)
                      : null;

                    if (computedWeight != null && section.liftName) {
                      return (
                        <PercentageRow
                          key={key}
                          repsLabel={repsLabel}
                          percentage={ps.percentage}
                          computedWeight={computedWeight}
                          unit={userMax!.unit}
                          date={date}
                          workoutId={workoutId}
                          liftName={section.liftName}
                          reps={repsPerSet}
                          sectionType={section.type}
                          setLabel={setCount > 1 ? `Set ${s + 1}/${setCount}` : undefined}
                          initialLogged={setIndex < loggedCount}
                          maxSource={userMax!.source}
                          effectiveMaxWeight={userMax!.maxWeight}
                        />
                      );
                    }

                    // No-max fallback: show tappable chip seeded from previous session weight
                    const prevLiftKey = olympicLiftName ?? section.liftName;
                    const prevWeight = prevLiftKey ? previousWeights?.[prevLiftKey]?.weight : undefined;
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between bg-surface-container p-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="shrink-0 font-headline font-bold">
                            {repsLabel}
                            <span className="mx-1 text-on-surface-variant">@</span>
                            {ps.percentage}%
                            {setCount > 1 && (
                              <span className="ml-2 text-[10px] font-normal text-on-surface-variant">
                                Set {s + 1}/{setCount}
                              </span>
                            )}
                          </span>
                          {section.liftName && (
                            <a
                              href="#barbell-1rm-section"
                              className="text-[9px] font-bold uppercase tracking-widest text-primary/60 underline underline-offset-2 hover:text-primary"
                            >
                              Set 1RM to auto-fill %
                            </a>
                          )}
                        </div>
                        {section.liftName ? (
                          <LogExerciseInline
                            date={date}
                            workoutId={workoutId}
                            exerciseName={section.liftName}
                            lastWeight={prevWeight}
                            sectionType={section.type}
                          />
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
                            —
                          </span>
                        )}
                      </div>
                    );
                  });
                  });
                })()}
              </div>
            ) : (
              <div className="flex flex-col gap-1 py-2">
                {isLoggable ? (
                  <SubstitutableExerciseRow
                    date={date}
                    workoutId={workoutId}
                    exerciseName={exercise.name}
                    sectionType={section.type}
                    previousWeights={previousWeights}
                    expectedSets={expectedSets}
                    defaultReps={parseDefaultReps(exercise.name) ?? sectionReps}
                    loggedSetsToday={loggedSetsToday}
                    initialReplacements={substitutions?.[normalizeLiftName(exercise.name)] ?? null}
                  />
                ) : (
                  <span className="font-bold text-on-surface">{exercise.name}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
