"use client";

import type { WizardState } from "./wizard";

interface Props {
  state: WizardState;
  onChange: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
  onNext: () => void;
}

function Slider({
  label, hint, value, onChange,
}: { label: string; hint: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-sm">{label}</label>
        <span className="font-headline text-sm font-black text-primary-container">{value}/5</span>
      </div>
      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">{hint}</p>
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full"
      />
    </div>
  );
}

export function StartingPointStep({ state, onChange, onNext }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-black uppercase tracking-tight">WHERE ARE YOU AT?</h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          A quick check on your training volume and current skills. We use this
          to pre-tick the most useful skills on the next step.
        </p>
      </div>

      <div>
        <label className="text-sm">WODs per week</label>
        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
          Roughly how many CrossFit / Barbell sessions you do
        </p>
        <input
          type="number"
          min={1}
          max={7}
          value={state.wodsPerWeek}
          onChange={(e) => onChange("wodsPerWeek", Number(e.target.value))}
          className="mt-2 w-full bg-surface-container px-3 py-2 text-sm"
        />
      </div>

      <Slider
        label="Rope work"
        hint="Double-unders, rope climbs"
        value={state.ropeConfidence}
        onChange={(v) => onChange("ropeConfidence", v)}
      />
      <Slider
        label="Handstands"
        hint="HSPU, handstand walks, kick-ups"
        value={state.handstandConfidence}
        onChange={(v) => onChange("handstandConfidence", v)}
      />
      <Slider
        label="Pull gymnastics"
        hint="Pull-ups, T2B, muscle-ups"
        value={state.pullGymConfidence}
        onChange={(v) => onChange("pullGymConfidence", v)}
      />

      <button
        onClick={onNext}
        type="button"
        className="w-full bg-primary-container py-3.5 font-headline text-sm font-black uppercase tracking-widest text-on-primary-fixed"
      >
        NEXT
      </button>
    </div>
  );
}
