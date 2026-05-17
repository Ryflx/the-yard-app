"use client";

import type { WizardState } from "./wizard";
import type { skillCourses } from "@/db/schema";

type Course = typeof skillCourses.$inferSelect;

interface Props {
  state: WizardState;
  courses: Course[];
  onBack: () => void;
  onCommit: () => void;
  pending: boolean;
}

export function ReviewStep({ state, courses, onBack, onCommit, pending }: Props) {
  const selectedCourses = courses.filter((c) => state.selectedSkillIds.includes(c.id));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-black uppercase tracking-tight">REVIEW & GENERATE</h2>
        <p className="mt-2 text-sm text-on-surface-variant">Looks good? We&apos;ll build the plan now.</p>
      </div>

      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">SKILLS</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {selectedCourses.map((c) => (<li key={c.id}>· {c.name}</li>))}
        </ul>
      </section>

      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">SLOTS</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {state.slots.map((s, i) => (
            <li key={i}>· {s.dow} {s.when.replace(/_/g, " ")} — {s.minutes}min</li>
          ))}
        </ul>
      </section>

      <div className="flex gap-2">
        <button onClick={onBack} type="button" disabled={pending} className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-on-surface-variant disabled:opacity-50">
          BACK
        </button>
        <button
          onClick={onCommit}
          type="button"
          disabled={pending}
          className="flex-[2] bg-primary-container py-3.5 font-headline text-sm font-black uppercase tracking-widest text-on-primary-fixed disabled:opacity-50"
        >
          {pending ? "GENERATING…" : "GENERATE PLAN"}
        </button>
      </div>
    </div>
  );
}
