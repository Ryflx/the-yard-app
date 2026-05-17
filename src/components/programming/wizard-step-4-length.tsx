"use client";

import type { WizardState } from "./wizard";

interface Props {
  state: WizardState;
  onBack: () => void;
  onNext: () => void;
}

export function LengthStep({ onBack, onNext }: Props) {
  const today = new Date();
  const ends = new Date(today);
  ends.setDate(ends.getDate() + 8 * 7 - 1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-black uppercase tracking-tight">PLAN LENGTH</h2>
        <p className="mt-2 text-sm text-on-surface-variant">Fixed at 8 weeks for now — configurable lengths coming soon.</p>
      </div>

      <div className="bg-surface-container p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">DURATION</p>
        <p className="mt-1 font-headline text-3xl font-black">8 WEEKS</p>
        <p className="mt-2 text-xs text-on-surface-variant">
          Today → {ends.toISOString().slice(0, 10)}
        </p>
      </div>

      <div className="flex gap-2">
        <button onClick={onBack} type="button" className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          BACK
        </button>
        <button onClick={onNext} type="button" className="flex-[2] bg-primary-container py-3.5 font-headline text-sm font-black uppercase tracking-widest text-on-primary-fixed">
          NEXT
        </button>
      </div>
    </div>
  );
}
