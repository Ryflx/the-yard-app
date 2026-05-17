"use client";

import type { WizardState } from "./wizard";
import type { WeaknessSignal } from "@/lib/programming/types";
import type { skillCourses } from "@/db/schema";

type Course = typeof skillCourses.$inferSelect;

interface Props {
  state: WizardState;
  courses: Course[];
  signals: WeaknessSignal[];
  onChange: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function SkillsStep({ state, courses, signals, onChange, onBack, onNext }: Props) {
  const reasonBySkill = new Map(signals.map((s) => [s.skillId, s.reason] as const));

  function toggle(id: number) {
    const next = state.selectedSkillIds.includes(id)
      ? state.selectedSkillIds.filter((x) => x !== id)
      : [...state.selectedSkillIds, id];
    if (next.length > 5) return;
    onChange("selectedSkillIds", next);
  }

  const grouped = new Map<string, Course[]>();
  for (const c of courses) {
    const arr = grouped.get(c.category) ?? [];
    arr.push(c);
    grouped.set(c.category, arr);
  }

  const topReasons = signals.slice(0, 2);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-black uppercase tracking-tight">WHAT TO IMPROVE</h2>
        <p className="mt-2 text-sm text-on-surface-variant">Pick 2–5 skills. Suggestions pre-ticked.</p>
      </div>

      {topReasons.length > 0 && (
        <div className="border-l-2 border-primary-container bg-surface-container px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary-container">Why these?</p>
          <ul className="mt-1 space-y-1 text-xs text-on-surface-variant">
            {topReasons.map((s) => (<li key={s.skillId}>· {s.reason}</li>))}
          </ul>
        </div>
      )}

      {state.selectedSkillIds.length >= 4 && (
        <p className="text-xs text-primary-container">
          Heads up — more skills means thinner placement. We recommend 2–3 for 8 weeks.
        </p>
      )}

      {Array.from(grouped.entries()).map(([category, list]) => (
        <div key={category}>
          <h3 className="font-headline text-xs font-black uppercase tracking-widest text-on-surface-variant">
            {category.replace(/_/g, " ")}
          </h3>
          <ul className="mt-2 space-y-1">
            {list.map((c) => {
              const checked = state.selectedSkillIds.includes(c.id);
              const reason = reasonBySkill.get(c.id);
              return (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-start gap-3 border-b border-outline-variant py-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!checked && state.selectedSkillIds.length >= 5}
                      onChange={() => toggle(c.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="text-sm">{c.name}</p>
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                        difficulty {c.difficulty}/5 · ~{c.estimatedSessionMinutes}min
                      </p>
                      {reason && <p className="mt-1 text-xs text-primary-container">★ {reason}</p>}
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="flex gap-2">
        <button onClick={onBack} className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          BACK
        </button>
        <button
          onClick={onNext}
          disabled={state.selectedSkillIds.length === 0}
          className="flex-[2] bg-primary-container py-3.5 font-headline text-sm font-black uppercase tracking-widest text-on-primary-fixed disabled:opacity-50"
        >
          NEXT ({state.selectedSkillIds.length}/5)
        </button>
      </div>
    </div>
  );
}
