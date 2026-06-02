// Note: this file is the Skills step, but it's now rendered at Wizard step 3.
"use client";

import type { WizardState } from "./wizard";
import type { skillCourses } from "@/db/schema";

type Course = typeof skillCourses.$inferSelect;

interface Props {
  state: WizardState;
  courses: Course[];
  onChange: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function SkillsStep({ state, courses, onChange, onBack, onNext }: Props) {
  function toggle(id: number) {
    const next = state.selectedSkillIds.includes(id)
      ? state.selectedSkillIds.filter((x) => x !== id)
      : [...state.selectedSkillIds, id];
    onChange("selectedSkillIds", next);
  }

  const grouped = new Map<string, Course[]>();
  for (const c of courses) {
    const arr = grouped.get(c.category) ?? [];
    arr.push(c);
    grouped.set(c.category, arr);
  }

  const selectedCourses = courses.filter((c) => state.selectedSkillIds.includes(c.id));
  const drillsPerWeek = selectedCourses.reduce((sum, c) => sum + c.drillsPerWeek, 0);
  const slotsPerWeek = state.slots.length;

  const noSlots = slotsPerWeek === 0 && drillsPerWeek > 0;
  const overByRatio = slotsPerWeek > 0 ? drillsPerWeek / slotsPerWeek : Infinity;
  const strongWarn = noSlots || overByRatio > 1.5;
  const softWarn = !strongWarn && drillsPerWeek > slotsPerWeek;

  const capacityCaption = noSlots
    ? "No slots set yet — go back to Step 2."
    : drillsPerWeek === 0
    ? "Tick a skill to see your weekly load."
    : strongWarn
    ? "Well over capacity — many drills won't fit."
    : softWarn
    ? "Slightly over capacity — some drills will be dropped."
    : "Looks good — everything fits.";

  const capacityToneClass = strongWarn
    ? "text-red-400"
    : softWarn
    ? "text-primary-container"
    : "text-on-surface-variant";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-black uppercase tracking-tight">
          WHAT DO YOU WANT TO IMPROVE?
        </h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          Tick anything you want to work on. We&apos;ll slot it into your training week.
        </p>
      </div>

      <div className="border border-outline-variant bg-surface-container px-4 py-3">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className={"font-headline text-3xl font-black tabular-nums " + capacityToneClass}>
              {drillsPerWeek}
            </p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              drills / week
            </p>
          </div>
          <p className="font-headline text-xs font-black uppercase tracking-widest text-on-surface-variant">
            vs
          </p>
          <div className="text-right">
            <p className="font-headline text-3xl font-black tabular-nums text-on-surface">
              {slotsPerWeek}
            </p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              slots / week
            </p>
          </div>
        </div>
        <p className={"mt-2 text-xs " + capacityToneClass}>{capacityCaption}</p>
      </div>

      {Array.from(grouped.entries()).map(([category, list]) => (
        <div key={category}>
          <h3 className="font-headline text-xs font-black uppercase tracking-widest text-on-surface-variant">
            {category.replace(/_/g, " ")}
          </h3>
          <ul className="mt-2 space-y-1">
            {list.map((c) => {
              const checked = state.selectedSkillIds.includes(c.id);
              return (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-start gap-3 border-b border-outline-variant py-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(c.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="text-sm">{c.name}</p>
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                        difficulty {c.difficulty}/5 · {c.drillsPerWeek}/week · ~{c.estimatedSessionMinutes}min
                      </p>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="flex gap-2">
        <button
          onClick={onBack}
          className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-on-surface-variant"
        >
          BACK
        </button>
        <button
          onClick={onNext}
          disabled={state.selectedSkillIds.length === 0}
          className="flex-[2] bg-primary-container py-3.5 font-headline text-sm font-black uppercase tracking-widest text-on-primary-fixed disabled:opacity-50"
        >
          NEXT ({state.selectedSkillIds.length})
        </button>
      </div>
    </div>
  );
}
