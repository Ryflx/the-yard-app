import type { PercentageSet } from "@/db/schema";
import { calculateWeight } from "@/lib/percentage";
import { LogExerciseInline } from "@/components/log-exercise-inline";
import { PercentageRow } from "@/components/percentage-row";

interface PreviousWeight {
  weight: number;
  reps: number | null;
  unit: string;
  prevWeight: number | null;
  prevReps: number | null;
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
  userMax?: { maxWeight: number; unit: string } | null;
  date: string;
  workoutId: number;
  previousWeights?: Record<string, PreviousWeight>;
  loggedSetsToday?: Record<string, number>;
}

function parseSetsAndReps(sets: string | null): { setCount?: number; repsPerSet?: number } {
  if (!sets) return {};
  // "3-3-3-3-3" → 5 sets of 3
  const dashMatch = sets.match(/^(\d+)(?:\s*-\s*\d+)+$/);
  if (dashMatch) {
    const parts = sets.split(/\s*-\s*/);
    return { setCount: parts.length, repsPerSet: parseInt(parts[0]) };
  }
  // "5 sets" or "5x3"
  const setsMatch = sets.match(/(\d+)\s*(?:sets?|x)\s*(\d+)?/i);
  if (setsMatch) {
    return {
      setCount: parseInt(setsMatch[1]),
      repsPerSet: setsMatch[2] ? parseInt(setsMatch[2]) : undefined,
    };
  }
  return {};
}

function parseDefaultReps(name: string): number | undefined {
  const match = name.match(/^(\d+)\s+/);
  return match ? parseInt(match[1]) : undefined;
}

export function SectionDisplay({ section, userMax, date, workoutId, previousWeights, loggedSetsToday }: SectionDisplayProps) {
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
                        />
                      );
                    }

                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between bg-surface-container p-3"
                      >
                        <span className="font-headline font-bold">
                          {repsLabel}
                          <span className="mx-1 text-on-surface-variant">@</span>
                          {ps.percentage}%
                          {setCount > 1 && (
                            <span className="ml-2 text-[10px] font-normal text-on-surface-variant">
                              Set {s + 1}/{setCount}
                            </span>
                          )}
                        </span>
                        {section.liftName ? (
                          <LogExerciseInline
                            date={date}
                            workoutId={workoutId}
                            exerciseName={section.liftName}
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-on-surface">
                      {exercise.name}
                    </span>
                    {previousWeights?.[exercise.name] && (() => {
                      const pw = previousWeights[exercise.name];
                      const delta = pw.prevWeight != null ? pw.weight - pw.prevWeight : null;
                      return (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                          <span>
                            PREV: {pw.weight}kg
                            {pw.reps && ` × ${pw.reps}`}
                          </span>
                          {delta != null && delta !== 0 && (
                            <span className={delta > 0 ? "text-primary" : "text-red-400"}>
                              <span className="material-symbols-outlined align-middle text-xs">
                                {delta > 0 ? "arrow_upward" : "arrow_downward"}
                              </span>
                              {Math.abs(delta).toFixed(1)}kg
                            </span>
                          )}
                        </span>
                      );
                    })()}
                  </div>
                  {isLoggable && (
                    <LogExerciseInline
                      date={date}
                      workoutId={workoutId}
                      exerciseName={exercise.name}
                      lastWeight={previousWeights?.[exercise.name]?.weight}
                      lastReps={previousWeights?.[exercise.name]?.reps ?? undefined}
                      defaultReps={parseDefaultReps(exercise.name) ?? sectionReps}
                      sectionType={section.type}
                      expectedSets={expectedSets}
                      initialLoggedCount={loggedSetsToday?.[exercise.name] ?? 0}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
