"use client";

import { useState } from "react";
import type { SectionExercise, WorkoutSectionType } from "@/db/schema";

interface SectionEditorProps {
  type: WorkoutSectionType;
  exercises: SectionExercise[];
  sets?: string;
  liftName?: string;
  onChange: (data: { exercises: SectionExercise[]; sets?: string; liftName?: string }) => void;
}

const SECTION_COLORS: Record<string, { bg: string; text: string }> = {
  "WARM UP": { bg: "#33333380", text: "#aaaaaa" },
  PRIMER: { bg: "#33333380", text: "#aaaaaa" },
  STRENGTH: { bg: "#2563eb20", text: "#60a5fa" },
  "STRENGTH 1": { bg: "#2563eb20", text: "#60a5fa" },
  "STRENGTH 2": { bg: "#2563eb20", text: "#60a5fa" },
  "STRENGTH 3": { bg: "#2563eb20", text: "#60a5fa" },
  SKILL: { bg: "#7c3aed20", text: "#a78bfa" },
  "HEAVY DAY": { bg: "#dc262620", text: "#f87171" },
  "LOADING UP": { bg: "#eab30820", text: "#fbbf24" },
  "OLYMPIC LIFT": { bg: "#eab30820", text: "#fbbf24" },
  ACCESSORY: { bg: "#33333380", text: "#aaaaaa" },
  "COOL DOWN": { bg: "#33333380", text: "#aaaaaa" },
  "ON RAMP": { bg: "#33333380", text: "#aaaaaa" },
};

export function SectionEditor({ type, exercises, sets, liftName, onChange }: SectionEditorProps) {
  const [editing, setEditing] = useState<number | null>(null);
  const colors = SECTION_COLORS[type] ?? { bg: "#33333380", text: "#aaaaaa" };

  function updateExercise(index: number, updated: SectionExercise) {
    const next = [...exercises];
    next[index] = updated;
    onChange({ exercises: next, sets, liftName });
  }

  function removeExercise(index: number) {
    onChange({ exercises: exercises.filter((_, i) => i !== index), sets, liftName });
  }

  function addExercise() {
    onChange({ exercises: [...exercises, { name: "" }], sets, liftName });
  }

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-2">
        <span
          className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {type}
        </span>
        {sets && (
          <input
            className="bg-transparent text-xs text-outline outline-none"
            value={sets}
            onChange={(e) => onChange({ exercises, sets: e.target.value, liftName })}
            placeholder="e.g. 5 sets"
          />
        )}
      </div>

      <div className="bg-surface-container">
        {liftName && (
          <div className="flex items-center justify-between border-b border-surface-container-highest px-4 py-3">
            <input
              className="bg-transparent font-headline text-sm font-bold text-on-surface outline-none"
              value={liftName}
              onChange={(e) => onChange({ exercises, sets, liftName: e.target.value })}
            />
          </div>
        )}

        {exercises.map((ex, i) => (
          <div key={i} className="border-b border-surface-container-highest px-4 py-2">
            {ex.percentageSets && ex.percentageSets.length > 0 ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  {!liftName && (
                    editing === i ? (
                      <input
                        className="bg-surface-container-high px-2 py-1 text-xs font-bold text-on-surface outline-none"
                        value={ex.name}
                        onChange={(e) => updateExercise(i, { ...ex, name: e.target.value })}
                        autoFocus
                      />
                    ) : (
                      <span className="text-xs font-bold text-on-surface">{ex.name}</span>
                    )
                  )}
                  <div className="flex items-center gap-1">
                    {editing === i ? (
                      <button onClick={() => setEditing(null)} className="text-xs text-primary">done</button>
                    ) : (
                      <button onClick={() => setEditing(i)} className="text-xs text-outline hover:text-primary">
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                    )}
                    <button onClick={() => removeExercise(i)} className="text-xs text-outline hover:text-error">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                </div>
                {editing === i ? (
                  ex.percentageSets.map((ps, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <input
                        className="w-8 bg-surface-container-high px-1 py-0.5 text-center text-sm font-bold text-primary outline-none"
                        value={ps.reps}
                        onChange={(e) => {
                          const next = [...(ex.percentageSets ?? [])];
                          next[j] = { ...ps, reps: e.target.value };
                          updateExercise(i, { ...ex, percentageSets: next });
                        }}
                      />
                      <span className="text-xs text-outline">@</span>
                      <input
                        className="w-12 bg-surface-container-high px-1 py-0.5 text-center text-xs text-outline outline-none"
                        value={ps.percentage}
                        type="number"
                        onChange={(e) => {
                          const next = [...(ex.percentageSets ?? [])];
                          next[j] = { ...ps, percentage: parseInt(e.target.value) || 0 };
                          updateExercise(i, { ...ex, percentageSets: next });
                        }}
                      />
                      <span className="text-xs text-outline">%</span>
                    </div>
                  ))
                ) : (
                  ex.percentageSets.map((ps, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <span className="w-8 text-sm font-bold text-primary">{ps.reps}</span>
                      <span className="text-xs text-outline">@ {ps.percentage}%</span>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {editing === i ? (
                  <>
                    <input
                      className="w-12 bg-surface-container-high px-2 py-1 text-center text-xs font-bold text-primary outline-none"
                      value={ex.reps ?? ""}
                      onChange={(e) => updateExercise(i, { ...ex, reps: e.target.value })}
                      placeholder="reps"
                      autoFocus
                    />
                    <input
                      className="flex-1 bg-surface-container-high px-2 py-1 text-xs text-on-surface outline-none"
                      value={ex.name}
                      onChange={(e) => updateExercise(i, { ...ex, name: e.target.value })}
                      placeholder="Exercise name"
                    />
                    <input
                      className="w-20 bg-surface-container-high px-2 py-1 text-right text-xs text-outline outline-none"
                      value={ex.weight ?? ""}
                      onChange={(e) => updateExercise(i, { ...ex, weight: e.target.value })}
                      placeholder="weight"
                    />
                    <button onClick={() => setEditing(null)} className="text-xs text-primary">
                      done
                    </button>
                  </>
                ) : (
                  <>
                    {ex.reps && <span className="shrink-0 text-sm font-bold text-primary">{ex.reps}</span>}
                    {!(liftName && ex.name.toLowerCase() === liftName.toLowerCase()) && (
                      <span className="flex-1 text-xs text-on-surface">{ex.name || "—"}</span>
                    )}
                    {ex.weight && <span className="text-xs text-outline">{ex.weight}</span>}
                    <button onClick={() => setEditing(i)} className="text-xs text-outline hover:text-primary">
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button onClick={() => removeExercise(i)} className="text-xs text-outline hover:text-error">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        <button
          onClick={addExercise}
          className="w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-primary"
        >
          + Add exercise
        </button>
      </div>
    </div>
  );
}
