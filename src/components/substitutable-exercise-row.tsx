"use client";

import { useState } from "react";
import { saveExerciseSubstitution, deleteExerciseSubstitution } from "@/app/actions";
import { LogExerciseInline } from "@/components/log-exercise-inline";
import { ExerciseSubstitutionPanel } from "@/components/exercise-substitution-panel";
import { toast } from "sonner";

interface PreviousWeight {
  weight: number;
  reps: number | null;
  unit: string;
  prevWeight: number | null;
  prevReps: number | null;
}

interface SubstitutableExerciseRowProps {
  date: string;
  workoutId: number;
  exerciseName: string;
  sectionType: string;
  previousWeights?: Record<string, PreviousWeight>;
  expectedSets?: number;
  defaultReps?: number;
  loggedSetsToday?: Record<string, number>;
  initialReplacements: string[] | null;
}

export function SubstitutableExerciseRow({
  date,
  workoutId,
  exerciseName,
  sectionType,
  previousWeights,
  expectedSets,
  defaultReps,
  loggedSetsToday,
  initialReplacements,
}: SubstitutableExerciseRowProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [replacements, setReplacements] = useState<string[] | null>(initialReplacements);
  const [undoing, setUndoing] = useState(false);

  async function handleConfirm(newReplacements: string[]) {
    await saveExerciseSubstitution(workoutId, date, exerciseName, newReplacements);
    setReplacements(newReplacements);
    setPanelOpen(false);
  }

  async function handleUndo() {
    setUndoing(true);
    try {
      await deleteExerciseSubstitution(workoutId, date, exerciseName);
      setReplacements(null);
    } catch {
      toast.error("Failed to remove substitution");
    } finally {
      setUndoing(false);
    }
  }

  if (replacements) {
    return (
      <div className="flex flex-col gap-1 py-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-on-surface-variant line-through opacity-40">
            {exerciseName}
          </span>
          <button
            onClick={handleUndo}
            disabled={undoing}
            className="text-[9px] font-bold uppercase tracking-widest text-outline hover:text-on-surface disabled:opacity-50"
          >
            {undoing ? "..." : "undo sub"}
          </button>
        </div>
        {replacements.map((name) => {
          const pw = previousWeights?.[name];
          const delta = pw?.prevWeight != null ? pw.weight - pw.prevWeight : null;
          return (
            <div key={name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-primary">↳</span>
                <span className="font-bold text-on-surface">{name}</span>
                <span className="text-[8px] font-bold uppercase tracking-widest text-outline">
                  sub
                </span>
                {pw && (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    PREV: {pw.weight}kg{pw.reps ? ` × ${pw.reps}` : ""}
                    {delta != null && delta !== 0 && (
                      <span className={delta > 0 ? "text-primary" : "text-red-400"}>
                        <span className="material-symbols-outlined align-middle text-xs">
                          {delta > 0 ? "arrow_upward" : "arrow_downward"}
                        </span>
                        {Math.abs(delta).toFixed(1)}kg
                      </span>
                    )}
                  </span>
                )}
              </div>
              <LogExerciseInline
                date={date}
                workoutId={workoutId}
                exerciseName={name}
                lastWeight={pw?.weight}
                lastReps={pw?.reps ?? undefined}
                defaultReps={defaultReps}
                sectionType={sectionType}
                expectedSets={expectedSets}
                initialLoggedCount={loggedSetsToday?.[name] ?? 0}
              />
            </div>
          );
        })}
      </div>
    );
  }

  const pw = previousWeights?.[exerciseName];
  const delta = pw?.prevWeight != null ? pw.weight - pw.prevWeight : null;

  return (
    <div>
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPanelOpen((o) => !o)}
            className="font-bold text-on-surface underline decoration-dotted underline-offset-2 hover:text-primary"
          >
            {exerciseName}
          </button>
          {pw && (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              PREV: {pw.weight}kg{pw.reps ? ` × ${pw.reps}` : ""}
              {delta != null && delta !== 0 && (
                <span className={delta > 0 ? "text-primary" : "text-red-400"}>
                  <span className="material-symbols-outlined align-middle text-xs">
                    {delta > 0 ? "arrow_upward" : "arrow_downward"}
                  </span>
                  {Math.abs(delta).toFixed(1)}kg
                </span>
              )}
            </span>
          )}
        </div>
        <LogExerciseInline
          date={date}
          workoutId={workoutId}
          exerciseName={exerciseName}
          lastWeight={pw?.weight}
          lastReps={pw?.reps ?? undefined}
          defaultReps={defaultReps}
          sectionType={sectionType}
          expectedSets={expectedSets}
          initialLoggedCount={loggedSetsToday?.[exerciseName] ?? 0}
        />
      </div>
      {panelOpen && (
        <ExerciseSubstitutionPanel
          onConfirm={handleConfirm}
          onCancel={() => setPanelOpen(false)}
        />
      )}
    </div>
  );
}
