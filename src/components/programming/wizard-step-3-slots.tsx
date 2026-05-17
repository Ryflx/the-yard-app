"use client";

import type { WizardState } from "./wizard";
import type { WeeklyDrillSlot } from "@/db/schema";

const DOWS: WeeklyDrillSlot["dow"][] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const WHENS: { value: WeeklyDrillSlot["when"]; label: string }[] = [
  { value: "before_class", label: "Before class" },
  { value: "after_class", label: "After class" },
  { value: "open_gym", label: "Open gym" },
];
const MINUTES: WeeklyDrillSlot["minutes"][] = [15, 30, 45, 60];

interface Props {
  state: WizardState;
  onChange: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function SlotsStep({ state, onChange, onBack, onNext }: Props) {
  function addSlot(dow: WeeklyDrillSlot["dow"]) {
    onChange("slots", [...state.slots, { dow, when: "after_class", minutes: 30 }]);
  }

  function updateSlot(i: number, patch: Partial<WeeklyDrillSlot>) {
    onChange("slots", state.slots.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function removeSlot(i: number) {
    onChange("slots", state.slots.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-black uppercase tracking-tight">WHEN CAN YOU TRAIN?</h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          Pick the days you can fit a 15–60 min skill session in. We&apos;ll only place drills
          on these days — alongside your normal classes, not instead of them.
        </p>
        <p className="mt-2 text-xs text-on-surface-variant">
          Tap a day below to add a slot. Tap again to add another slot to the same day.
        </p>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DOWS.map((dow) => {
          const count = state.slots.filter((s) => s.dow === dow).length;
          return (
            <button
              key={dow}
              onClick={() => addSlot(dow)}
              type="button"
              className={
                "flex flex-col items-center py-3 text-[10px] font-bold uppercase tracking-widest transition-colors " +
                (count > 0
                  ? "bg-primary-container text-on-primary-fixed"
                  : "bg-surface-container text-on-surface hover:bg-surface-container-high")
              }
            >
              <span>{dow}</span>
              <span className={count > 0 ? "text-on-primary-fixed" : "text-primary-container"}>
                +{count}
              </span>
            </button>
          );
        })}
      </div>

      {state.slots.length === 0 ? (
        <p className="bg-surface-container px-3 py-4 text-center text-xs text-on-surface-variant">
          No slots yet — tap a day above to add one.
        </p>
      ) : (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            YOUR WEEKLY SLOTS ({state.slots.length})
          </p>
          <ul className="mt-2 space-y-2">
            {state.slots.map((s, i) => (
              <li key={i} className="flex items-center gap-2 border-b border-outline-variant py-2">
                <span className="w-10 text-xs font-bold uppercase">{s.dow}</span>
                <select
                  value={s.when}
                  onChange={(e) => updateSlot(i, { when: e.target.value as WeeklyDrillSlot["when"] })}
                  className="flex-1 bg-surface-container px-2 py-1 text-xs"
                >
                  {WHENS.map((w) => (<option key={w.value} value={w.value}>{w.label}</option>))}
                </select>
                <select
                  value={s.minutes}
                  onChange={(e) => updateSlot(i, { minutes: Number(e.target.value) as WeeklyDrillSlot["minutes"] })}
                  className="w-20 bg-surface-container px-2 py-1 text-xs"
                >
                  {MINUTES.map((m) => (<option key={m} value={m}>{m}min</option>))}
                </select>
                <button
                  onClick={() => removeSlot(i)}
                  type="button"
                  aria-label={`Remove ${s.dow} slot`}
                  className="px-2 text-base text-on-surface-variant hover:text-on-surface"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={onBack} type="button" className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          BACK
        </button>
        <button
          onClick={onNext}
          type="button"
          disabled={state.slots.length === 0}
          className="flex-[2] bg-primary-container py-3.5 font-headline text-sm font-black uppercase tracking-widest text-on-primary-fixed disabled:opacity-50"
        >
          NEXT
        </button>
      </div>
    </div>
  );
}
