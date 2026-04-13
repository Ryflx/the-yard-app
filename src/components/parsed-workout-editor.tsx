"use client";

import { useState } from "react";
import { addWorkout, updateWorkout } from "@/app/actions";
import type { ClassType } from "@/db/schema";
import type { ParsedSection } from "@/lib/workout-parser";
import { SectionEditor } from "./section-editor";
import { WodSectionEditor } from "./wod-section-editor";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ParsedWorkoutEditorProps {
  classType: ClassType;
  title: string;
  date: string;
  sections: ParsedSection[];
  editingWorkoutId?: number;
  onReparse?: () => void;
}

export function ParsedWorkoutEditor({
  classType: initialClassType,
  title: initialTitle,
  date: initialDate,
  sections: initialSections,
  editingWorkoutId,
  onReparse,
}: ParsedWorkoutEditorProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [classType, setClassType] = useState<ClassType>(initialClassType);
  const [title, setTitle] = useState(initialTitle);
  const [date, setDate] = useState(initialDate);
  const [sections, setSections] = useState<ParsedSection[]>(initialSections);

  function updateSection(index: number, partial: Partial<ParsedSection>) {
    const next = [...sections];
    next[index] = { ...next[index], ...partial };
    setSections(next);
  }

  function removeSection(index: number) {
    setSections(sections.filter((_, i) => i !== index));
  }

  function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next);
  }

  function addSection() {
    setSections([
      ...sections,
      { type: "WOD", sortOrder: sections.length, exercises: [], wodMovements: [] },
    ]);
  }

  async function handleSave() {
    if (!date) { toast.error("Pick a date"); return; }
    if (!title.trim()) { toast.error("Enter a title"); return; }

    setSaving(true);
    try {
      const payload = {
        date,
        title: title.trim(),
        classType,
        sections: sections
          .filter((s) => {
            if (s.type === "WOD") return (s.wodMovements?.length ?? 0) > 0 || s.wodDescription;
            return s.exercises.length > 0 && s.exercises.some((e) => e.name.trim());
          })
          .map((s) => ({
            type: s.type,
            sets: s.sets,
            liftName: s.liftName,
            exercises: s.exercises,
            wodScoreType: s.wodScoreType,
            timeCap: s.timeCap,
            wodName: s.wodName,
            rxWeights: s.rxWeights,
            wodFormat: s.wodFormat,
            wodRounds: s.wodRounds,
            wodInterval: s.wodInterval,
            wodDescription: s.wodDescription,
            wodMovements: s.wodMovements,
          })),
      };

      if (editingWorkoutId) {
        await updateWorkout(editingWorkoutId, payload);
        toast.success("Workout updated");
      } else {
        await addWorkout(payload);
        toast.success("Workout saved");
      }
      router.push("/admin/workouts");
      router.refresh();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-sm text-primary">← Back</button>
          <input
            className="bg-transparent font-headline text-lg font-bold text-on-surface outline-none"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Workout title"
          />
        </div>
        <span className="bg-primary/10 px-2 py-1 text-[9px] font-bold text-primary">
          {editingWorkoutId ? "EDITING" : "AI PARSED"}
        </span>
      </div>

      {/* Date + Class Type */}
      <div className="flex gap-3">
        <div className="flex-1 bg-surface-container px-3 py-2">
          <span className="block text-[9px] font-bold uppercase tracking-widest text-outline">DATE</span>
          <input
            type="date"
            className="mt-1 w-full bg-transparent text-sm text-on-surface outline-none"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="bg-surface-container px-3 py-2">
          <span className="block text-[9px] font-bold uppercase tracking-widest text-outline">CLASS</span>
          <div className="mt-1 flex gap-1">
            {(["BARBELL", "CROSSFIT"] as const).map((ct) => (
              <button
                key={ct}
                onClick={() => setClassType(ct)}
                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                  classType === ct
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-highest text-outline"
                }`}
              >
                {ct}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sections */}
      {sections.map((section, i) => (
        <div key={i} className="relative">
          <div className="absolute right-0 top-0 z-10 flex items-center gap-0.5">
            {i > 0 && (
              <button onClick={() => moveSection(i, -1)} className="p-1 text-outline hover:text-primary">
                <span className="material-symbols-outlined text-sm">arrow_upward</span>
              </button>
            )}
            {i < sections.length - 1 && (
              <button onClick={() => moveSection(i, 1)} className="p-1 text-outline hover:text-primary">
                <span className="material-symbols-outlined text-sm">arrow_downward</span>
              </button>
            )}
            <button onClick={() => removeSection(i)} className="p-1 text-outline hover:text-error">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
          {section.type === "WOD" ? (
            <WodSectionEditor
              wodFormat={section.wodFormat}
              wodScoreType={section.wodScoreType}
              wodRounds={section.wodRounds}
              wodInterval={section.wodInterval}
              timeCap={section.timeCap}
              wodName={section.wodName}
              rxWeights={section.rxWeights}
              wodMovements={section.wodMovements ?? []}
              wodDescription={section.wodDescription}
              onChange={(data) => updateSection(i, data)}
            />
          ) : (
            <SectionEditor
              type={section.type}
              exercises={section.exercises}
              sets={section.sets}
              liftName={section.liftName}
              onChange={(data) => updateSection(i, { exercises: data.exercises, sets: data.sets, liftName: data.liftName })}
            />
          )}
        </div>
      ))}

      <button
        onClick={addSection}
        className="w-full border border-dashed border-outline/30 py-3 text-[10px] font-bold uppercase tracking-widest text-outline"
      >
        + Add section
      </button>

      {/* Actions */}
      <div className="flex gap-3">
        {onReparse && (
          <button
            onClick={onReparse}
            className="flex-1 border border-surface-container-highest py-3 text-[10px] font-bold uppercase tracking-widest text-outline"
          >
            ↻ RE-PARSE
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-[2] bg-primary py-3 font-headline text-[11px] font-bold uppercase tracking-widest text-on-primary disabled:opacity-50"
        >
          {saving ? "SAVING..." : editingWorkoutId ? "UPDATE WORKOUT" : "SAVE WORKOUT"}
        </button>
      </div>
    </div>
  );
}
