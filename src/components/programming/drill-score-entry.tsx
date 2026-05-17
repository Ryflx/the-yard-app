"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { logWodResult } from "@/app/actions";
import type { wodResults, WodScoreType } from "@/db/schema";

type WodResult = typeof wodResults.$inferSelect;

interface Props {
  workoutId: number;
  sectionId: number;
  scoreType: WodScoreType;
  existingScore?: WodResult;
  placeholder?: string;
}

/**
 * Minimal score entry for CUSTOM skill drills — notes-only. The standard
 * WodScoreEntry's Rx/Scaled + rounds-completed UI is metcon-shaped and
 * overkill for "record your MAX reps per set" type drills.
 */
export function DrillScoreEntry({
  workoutId,
  sectionId,
  scoreType,
  existingScore,
  placeholder,
}: Props) {
  const [text, setText] = useState(existingScore?.notes ?? "");
  const [pending, startTransition] = useTransition();
  const savedText = existingScore?.notes ?? "";
  const isDirty = text.trim() !== savedText.trim();
  const hasSaved = !!existingScore;

  function save() {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("Add your reps / notes first");
      return;
    }
    startTransition(async () => {
      try {
        await logWodResult({
          workoutId,
          sectionId,
          scoreType,
          scoreValue: trimmed,
          rxLevel: "RX",
          public: false,
          notes: trimmed,
        });
        toast.success("Saved");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  return (
    <div className="bg-surface-container p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
        Your reps / notes
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder ?? "e.g. 10 / 8 / 6"}
        rows={2}
        maxLength={1000}
        className="mt-2 w-full resize-none bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none placeholder:text-outline"
      />
      <div className="mt-3 flex items-center justify-end gap-3">
        {hasSaved && !isDirty && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Saved
          </span>
        )}
        <button
          type="button"
          onClick={save}
          disabled={pending || !isDirty}
          className="bg-primary-container px-4 py-2 font-headline text-xs font-black uppercase tracking-widest text-on-primary-fixed transition-opacity disabled:opacity-40"
        >
          {pending ? "SAVING…" : hasSaved ? "UPDATE" : "SAVE"}
        </button>
      </div>
    </div>
  );
}
