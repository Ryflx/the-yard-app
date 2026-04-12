"use client";

import { useState } from "react";
import { MaxEntryForm } from "@/components/max-entry-form";

interface Barbell1RMSectionProps {
  liftName: string;
  currentMax?: number | null;
  unit?: string;
}

export function Barbell1RMSection({ liftName, currentMax, unit = "kg" }: Barbell1RMSectionProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return (
      <div className="flex items-center justify-between bg-surface-container px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-base text-primary">tips_and_updates</span>
          <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            JUST LIFT WHAT FEELS RIGHT — WE&apos;LL ESTIMATE YOUR 1RM
          </p>
        </div>
        <button
          onClick={() => setDismissed(false)}
          className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
        >
          SET 1RM
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between bg-surface-container-high px-5 py-4">
      <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
        YOUR 1RM — {liftName.toUpperCase()}
      </span>
      <MaxEntryForm
        liftName={liftName}
        currentMax={currentMax}
        unit={unit}
        onDismiss={() => setDismissed(true)}
      />
    </div>
  );
}
