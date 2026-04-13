"use client";

import { useState } from "react";
import { LogSetButton } from "@/components/log-set-button";
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
}: PercentageRowProps) {
  const [plateOpen, setPlateOpen] = useState(false);

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
        <div className="flex shrink-0 items-center gap-1">
          <PlateToggle open={plateOpen} onToggle={() => setPlateOpen(!plateOpen)} />
          <LogSetButton
            date={date}
            workoutId={workoutId}
            liftName={liftName}
            weight={computedWeight}
            reps={reps}
            unit={unit}
            sectionType={sectionType}
          />
        </div>
      </div>
      {plateOpen && <PlatePanel weight={computedWeight} unit={unit} />}
    </div>
  );
}
