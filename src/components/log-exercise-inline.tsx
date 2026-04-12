"use client";

import { useState } from "react";
import { logLift } from "@/app/actions";
import { toast } from "sonner";
import { useRestTimer } from "@/components/rest-timer";
import { usePRCelebration } from "@/components/pr-celebration";

interface LoggedSet {
  weight: number;
  reps?: number;
}

interface LogExerciseInlineProps {
  date: string;
  workoutId: number;
  exerciseName: string;
  lastWeight?: number;
  lastReps?: number;
  sectionType?: string;
}

export function LogExerciseInline({
  date,
  workoutId,
  exerciseName,
  lastWeight,
  lastReps,
  sectionType = "STRENGTH 1",
}: LogExerciseInlineProps) {
  const { startTimer } = useRestTimer();
  const { celebrate } = usePRCelebration();
  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState(lastWeight?.toString() ?? "");
  const [reps, setReps] = useState(lastReps?.toString() ?? "");
  const [loading, setLoading] = useState(false);
  const [loggedSets, setLoggedSets] = useState<LoggedSet[]>([]);

  async function handleLog() {
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0) return;

    setLoading(true);
    try {
      const result = await logLift({
        workoutId,
        date,
        liftName: exerciseName,
        weight: w,
        reps: reps ? parseInt(reps) : undefined,
      });
      setLoggedSets((prev) => [...prev, { weight: w, reps: reps ? parseInt(reps) : undefined }]);
      setWeight(w.toString());
      setOpen(false);
      if (result.isPR) {
        celebrate({ liftName: exerciseName, weight: w, unit: "kg", previousBest: result.previousBest });
      } else {
        toast.success(`Set ${loggedSets.length + 1} logged`);
      }
      startTimer(sectionType);
    } catch {
      toast.error("Failed to log");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      {loggedSets.length > 0 && (
        <div className="flex flex-wrap items-center justify-end gap-1">
          {loggedSets.map((s, i) => (
            <span
              key={i}
              className="bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary"
            >
              {s.weight}kg{s.reps ? ` x${s.reps}` : ""}
            </span>
          ))}
        </div>
      )}

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="squishy flex items-center gap-1 bg-surface-variant px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface transition-colors hover:bg-surface-bright"
        >
          <span className="material-symbols-outlined text-sm">add_task</span>
          {loggedSets.length > 0 ? `SET ${loggedSets.length + 1}` : "LOG"}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.5"
            min="0"
            placeholder="kg"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLog();
              if (e.key === "Escape") setOpen(false);
            }}
            className="w-16 border-0 border-b border-outline-variant bg-transparent p-0 py-1 text-center font-headline text-sm font-bold text-on-surface placeholder:text-outline focus:border-primary focus:ring-0"
          />
          <input
            type="number"
            min="1"
            placeholder="reps"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLog();
              if (e.key === "Escape") setOpen(false);
            }}
            className="w-12 border-0 border-b border-outline-variant bg-transparent p-0 py-1 text-center font-headline text-sm font-bold text-on-surface placeholder:text-outline focus:border-primary focus:ring-0"
          />
          <button
            onClick={handleLog}
            disabled={loading}
            className="squishy bg-primary-container px-2 py-1 text-[10px] font-bold text-on-primary-fixed disabled:opacity-50"
          >
            {loading ? "..." : "OK"}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="text-outline hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}
    </div>
  );
}
