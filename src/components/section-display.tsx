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
}

export function SectionDisplay({ section, userMax, date, workoutId, previousWeights }: SectionDisplayProps) {
  const isOlympic = section.type === "OLYMPIC LIFT";
  const isLoggable =
    isOlympic ||
    section.type.startsWith("STRENGTH") ||
    section.type === "ACCESSORY";

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
                {exercise.percentageSets.map((ps, j) => {
                  const repsNum = parseInt(ps.reps) || 1;
                  const computedWeight = userMax
                    ? calculateWeight(userMax.maxWeight, ps.percentage)
                    : null;

                  if (computedWeight != null && section.liftName) {
                    return (
                      <PercentageRow
                        key={j}
                        repsLabel={ps.reps}
                        percentage={ps.percentage}
                        computedWeight={computedWeight}
                        unit={userMax!.unit}
                        date={date}
                        workoutId={workoutId}
                        liftName={section.liftName}
                        reps={repsNum}
                        sectionType={section.type}
                      />
                    );
                  }

                  return (
                    <div
                      key={j}
                      className="flex items-center justify-between bg-surface-container p-3"
                    >
                      <span className="font-headline font-bold">
                        {ps.reps}
                        <span className="mx-1 text-on-surface-variant">@</span>
                        {ps.percentage}%
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
                })}
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
                      sectionType={section.type}
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
