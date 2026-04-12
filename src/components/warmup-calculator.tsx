"use client";

import { useState } from "react";

const WARMUP_PERCENTAGES = [0, 40, 50, 60, 70];
const BAR_WEIGHT = 20;

function roundToNearest(weight: number, increment: number = 2.5): number {
  return Math.round(weight / increment) * increment;
}

interface WarmupCalculatorProps {
  workingWeight: number;
  unit?: string;
}

export function WarmupCalculator({
  workingWeight,
  unit = "kg",
}: WarmupCalculatorProps) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant transition-colors hover:text-primary"
      >
        <span className="material-symbols-outlined text-sm">
          local_fire_department
        </span>
        WARM-UP SETS
      </button>
    );
  }

  const sets = WARMUP_PERCENTAGES.map((pct) => {
    if (pct === 0) {
      return { label: "EMPTY BAR", weight: BAR_WEIGHT, reps: 5 };
    }
    const w = roundToNearest((workingWeight * pct) / 100);
    const clamped = Math.max(w, BAR_WEIGHT);
    return {
      label: `${pct}%`,
      weight: clamped,
      reps: pct <= 50 ? 5 : 3,
    };
  });

  sets.push({
    label: "WORKING",
    weight: workingWeight,
    reps: 0,
  });

  return (
    <div className="bg-surface-container p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          <span className="material-symbols-outlined text-sm text-primary">
            local_fire_department
          </span>
          WARM-UP TO {workingWeight}
          {unit}
        </span>
        <button
          onClick={() => setOpen(false)}
          className="text-outline hover:text-on-surface"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
      <div className="flex flex-col gap-px">
        {sets.map((set, i) => (
          <div
            key={i}
            className={`flex items-center justify-between px-3 py-2 ${
              set.label === "WORKING"
                ? "bg-primary-container/20"
                : "bg-surface-container-high"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="w-8 text-right text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                {set.label}
              </span>
              <span
                className={`font-headline font-bold ${
                  set.label === "WORKING"
                    ? "text-primary"
                    : "text-on-surface"
                }`}
              >
                {set.weight} {unit}
              </span>
            </div>
            {set.reps > 0 && (
              <span className="text-[10px] font-bold text-on-surface-variant">
                × {set.reps}
              </span>
            )}
            {set.label === "WORKING" && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                GO
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
