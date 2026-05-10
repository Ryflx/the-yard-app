"use client";

import { useState, useTransition } from "react";
import { logLift, setUserMax } from "@/app/actions";
import { toast } from "sonner";
import { useRestTimer } from "@/components/rest-timer";
import { usePRCelebration } from "@/components/pr-celebration";
import { PlateToggle, PlatePanel } from "@/components/plate-calculator";

interface PercentageRowProps {
  repsLabel: string;
  percentage: number;
  computedWeight: number;
  unit: string;
  date: string;
  workoutId: number;
  liftName: string;
  reps: number;
  sectionType: string;
  setLabel?: string;
  initialLogged?: boolean;
  maxSource?: "manual" | "estimated";
  effectiveMaxWeight?: number;
}

export function PercentageRow({
  repsLabel,
  percentage,
  computedWeight,
  unit,
  date,
  workoutId,
  liftName,
  reps,
  sectionType,
  setLabel,
  initialLogged = false,
  maxSource,
  effectiveMaxWeight,
}: PercentageRowProps) {
  const { startTimer } = useRestTimer();
  const { celebrate } = usePRCelebration();
  const [plateOpen, setPlateOpen] = useState(false);
  const [logged, setLogged] = useState(initialLogged);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customWeight, setCustomWeight] = useState(computedWeight.toString());
  const [customReps, setCustomReps] = useState(reps.toString());
  const [pinning, startPinTransition] = useTransition();

  async function handleLog(w: number, r: number) {
    setLoading(true);
    try {
      const result = await logLift({ workoutId, date, liftName, weight: w, reps: r });
      setLogged(true);
      setEditing(false);
      if (result.isPR) {
        celebrate({ liftName, weight: w, unit, previousBest: result.previousBest });
      } else {
        toast.success(`${w}${unit} × ${r} logged`);
      }
      startTimer(sectionType);
    } catch {
      toast.error("Failed to log");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit() {
    const w = parseFloat(customWeight) || 0;
    const r = parseInt(customReps);
    if (w < 0) return;
    handleLog(w, isNaN(r) ? reps : r);
  }

  function handlePinEst() {
    if (!effectiveMaxWeight) return;
    startPinTransition(async () => {
      try {
        await setUserMax(liftName, effectiveMaxWeight);
        toast.success(`1RM set to ${effectiveMaxWeight}${unit}`);
      } catch {
        toast.error("Failed to pin 1RM");
      }
    });
  }

  const showEstBadge = maxSource === "estimated";

  if (logged) {
    return (
      <div className="flex flex-col bg-surface-container transition-colors hover:bg-surface-container-high">
        <div className="flex items-center justify-between p-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="shrink-0 font-headline font-bold">
              {repsLabel}
              <span className="mx-1 text-on-surface-variant">@</span>
              {percentage}%
            </span>
            <span className="shrink-0 font-headline text-lg font-bold text-primary-container">
              {computedWeight}{unit}
            </span>
            {setLabel && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                {setLabel}
              </span>
            )}
          </div>
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary">
            <span
              className="material-symbols-outlined text-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            LOGGED
          </span>
        </div>
        {plateOpen && <PlatePanel weight={computedWeight} unit={unit} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-surface-container transition-colors hover:bg-surface-container-high">
      <div className="flex items-center justify-between p-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 font-headline font-bold">
            {repsLabel}
            <span className="mx-1 text-on-surface-variant">@</span>
            {percentage}%
          </span>

          {editing ? (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.5"
                min="0"
                value={customWeight}
                onChange={(e) => setCustomWeight(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                  if (e.key === "Escape") {
                    setEditing(false);
                    setCustomWeight(computedWeight.toString());
                    setCustomReps(reps.toString());
                  }
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
                  if (e.key === "Enter") handleSubmit();
                  if (e.key === "Escape") {
                    setEditing(false);
                    setCustomWeight(computedWeight.toString());
                    setCustomReps(reps.toString());
                  }
                }}
                className="w-10 border-0 border-b border-outline-variant bg-transparent p-0 py-0.5 text-center font-headline text-sm font-bold text-on-surface placeholder:text-outline focus:border-primary focus:ring-0"
              />
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="squishy bg-primary-container px-2 py-1 text-[10px] font-bold text-on-primary-fixed disabled:opacity-50"
              >
                {loading ? "..." : "OK"}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setCustomWeight(computedWeight.toString());
                  setCustomReps(reps.toString());
                }}
                className="text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setEditing(true)}
                className="squishy flex items-center gap-1 bg-primary-container/40 px-2 py-0.5 font-headline text-lg font-bold text-primary-container transition-colors hover:bg-primary-container/60"
                title="Tap to edit and log"
              >
                {computedWeight}{unit}
              </button>
              {showEstBadge && (
                <button
                  onClick={handlePinEst}
                  disabled={pinning}
                  title="Estimated 1RM — tap to pin as your manual max"
                  className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60 transition-colors hover:text-on-surface-variant disabled:opacity-40"
                >
                  {pinning ? "..." : "EST"}
                </button>
              )}
            </div>
          )}

          {setLabel && !editing && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              {setLabel}
            </span>
          )}
        </div>

        {!editing && (
          <div className="flex shrink-0 items-center gap-1">
            <PlateToggle open={plateOpen} onToggle={() => setPlateOpen(!plateOpen)} />
          </div>
        )}
      </div>
      {plateOpen && <PlatePanel weight={computedWeight} unit={unit} />}
    </div>
  );
}
