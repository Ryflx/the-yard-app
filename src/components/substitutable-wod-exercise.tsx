"use client";

import { useState } from "react";
import { saveExerciseSubstitution, deleteExerciseSubstitution } from "@/app/actions";
import { ExerciseSubstitutionPanel } from "@/components/exercise-substitution-panel";
import { toast } from "sonner";

interface SubstitutableWodExerciseProps {
  date: string;
  workoutId: number;
  exerciseName: string;
  initialReplacements: string[] | null;
}

export function SubstitutableWodExercise({
  date,
  workoutId,
  exerciseName,
  initialReplacements,
}: SubstitutableWodExerciseProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [replacements, setReplacements] = useState<string[] | null>(initialReplacements);
  const [undoing, setUndoing] = useState(false);

  async function handleConfirm(newReplacements: string[]) {
    try {
      await saveExerciseSubstitution(workoutId, date, exerciseName, newReplacements);
      setReplacements(newReplacements);
      setPanelOpen(false);
    } catch {
      toast.error("Failed to save substitution");
    }
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

  if (replacements && replacements.length > 0) {
    return (
      <div className="flex flex-col gap-1 py-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-on-surface-variant line-through opacity-40">
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
        {replacements.map((name) => (
          <div key={name} className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-primary">↳</span>
            <span className="font-bold text-on-surface">{name}</span>
            <span className="text-[8px] font-bold uppercase tracking-widest text-outline">
              sub
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="py-1">
      <button
        onClick={() => setPanelOpen((o) => !o)}
        className="text-left font-bold text-on-surface underline decoration-dotted underline-offset-2 hover:text-primary"
      >
        {exerciseName}
      </button>
      {panelOpen && (
        <ExerciseSubstitutionPanel
          onConfirm={handleConfirm}
          onCancel={() => setPanelOpen(false)}
        />
      )}
    </div>
  );
}
