"use client";

import { useState } from "react";
import { logLift } from "@/app/actions";
import { toast } from "sonner";
import { useRestTimer } from "@/components/rest-timer";
import { usePRCelebration } from "@/components/pr-celebration";

interface LogSetButtonProps {
  date: string;
  workoutId: number;
  liftName: string;
  weight: number;
  reps: number;
  unit?: string;
  sectionType?: string;
}

export function LogSetButton({
  date,
  workoutId,
  liftName,
  weight: presetWeight,
  reps: presetReps,
  unit = "kg",
  sectionType = "OLYMPIC LIFT",
}: LogSetButtonProps) {
  const { startTimer } = useRestTimer();
  const { celebrate } = usePRCelebration();
  const [logged, setLogged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [customWeight, setCustomWeight] = useState(presetWeight.toString());
  const [customReps, setCustomReps] = useState(presetReps.toString());

  async function handleLog(w?: number, r?: number) {
    const finalWeight = w ?? presetWeight;
    const finalReps = r ?? presetReps;
    setLoading(true);
    try {
      const result = await logLift({ workoutId, date, liftName, weight: finalWeight, reps: finalReps });
      setLogged(true);
      setEditing(false);
      if (result.isPR) {
        celebrate({ liftName, weight: finalWeight, unit, previousBest: result.previousBest });
      } else {
        toast.success(`${finalWeight}${unit} × ${finalReps} logged`);
      }
      startTimer(sectionType);
    } catch {
      toast.error("Failed to log");
    } finally {
      setLoading(false);
    }
  }

  function handleCustomSubmit() {
    const w = parseFloat(customWeight);
    const r = parseInt(customReps);
    if (isNaN(w) || w <= 0) return;
    handleLog(w, isNaN(r) ? presetReps : r);
  }

  if (logged) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary">
        <span
          className="material-symbols-outlined text-sm"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          check_circle
        </span>
        LOGGED
      </span>
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          step="0.5"
          min="0"
          value={customWeight}
          onChange={(e) => setCustomWeight(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCustomSubmit();
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-14 border-0 border-b border-outline-variant bg-transparent p-0 py-0.5 text-center font-headline text-sm font-bold text-on-surface placeholder:text-outline focus:border-primary focus:ring-0"
        />
        <span className="text-[10px] text-on-surface-variant">×</span>
        <input
          type="number"
          min="1"
          value={customReps}
          onChange={(e) => setCustomReps(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCustomSubmit();
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-10 border-0 border-b border-outline-variant bg-transparent p-0 py-0.5 text-center font-headline text-sm font-bold text-on-surface placeholder:text-outline focus:border-primary focus:ring-0"
        />
        <button
          onClick={handleCustomSubmit}
          disabled={loading}
          className="squishy bg-primary-container px-2 py-1 text-[10px] font-bold text-on-primary-fixed disabled:opacity-50"
        >
          {loading ? "..." : "OK"}
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setCustomWeight(presetWeight.toString());
            setCustomReps(presetReps.toString());
          }}
          className="text-outline hover:text-on-surface"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleLog()}
        disabled={loading}
        className="squishy flex items-center gap-1 bg-surface-variant px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface transition-colors hover:bg-surface-bright disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-sm">add_task</span>
        {loading ? "..." : "LOG"}
      </button>
      <button
        onClick={() => setEditing(true)}
        className="flex items-center justify-center p-1.5 text-outline transition-colors hover:text-on-surface"
        title="Adjust weight/reps"
      >
        <span className="material-symbols-outlined text-sm">edit</span>
      </button>
    </div>
  );
}
