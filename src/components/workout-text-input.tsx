"use client";

import { useState } from "react";
import { parseWorkoutText } from "@/app/actions";
import type { ClassType } from "@/db/schema";
import type { ParsedWorkout } from "@/lib/workout-parser";
import { ParsedWorkoutEditor } from "./parsed-workout-editor";
import { toast } from "sonner";

export function WorkoutTextInput() {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [classType, setClassType] = useState<ClassType>("CROSSFIT");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedWorkout | null>(null);

  async function handleParse() {
    if (!text.trim()) { toast.error("Enter a workout"); return; }

    setParsing(true);
    try {
      const result = await parseWorkoutText({ text: text.trim() });
      setParsed(result);
      if (!title.trim() && result.title) setTitle(result.title);
      if (result.classType) setClassType(result.classType);
    } catch (err) {
      toast.error("Failed to parse — check the text and try again");
      console.error(err);
    } finally {
      setParsing(false);
    }
  }

  if (parsed) {
    return (
      <ParsedWorkoutEditor
        classType={classType}
        title={title || parsed.title}
        date={date}
        sections={parsed.sections}
        onReparse={() => setParsed(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
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

      {/* Title */}
      <div className="bg-surface-container px-3 py-2">
        <span className="block text-[9px] font-bold uppercase tracking-widest text-outline">TITLE</span>
        <input
          className="mt-1 w-full bg-transparent text-sm text-on-surface outline-none"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Monday CrossFit"
        />
      </div>

      {/* Text area */}
      <div className="bg-surface-container px-3 py-3">
        <span className="mb-2 block text-[9px] font-bold uppercase tracking-widest text-outline">
          PASTE OR TYPE YOUR WORKOUT
        </span>
        <textarea
          className="min-h-[200px] w-full resize-y bg-transparent font-mono text-sm leading-relaxed text-on-surface outline-none placeholder:text-outline/50"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Warm Up:\n3 rounds\n10 PVC pass throughs\n10 air squats\n200m jog\n\nStrength:\nBack Squat 5x5 @ 75%\n\nWOD:\nAMRAP 12 min\n5 Power Cleans (60/42.5kg)\n10 Box Jumps (24/20\")\n15 Wall Balls (9/6kg)"}
        />
      </div>

      {/* Parse button */}
      <button
        onClick={handleParse}
        disabled={parsing}
        className="squishy w-full bg-primary py-3.5 font-headline text-[11px] font-bold uppercase tracking-widest text-on-primary disabled:opacity-50"
      >
        {parsing ? "PARSING..." : "✨ PARSE WORKOUT"}
      </button>

      {/* Upload link */}
      <div className="text-center">
        <span className="text-xs text-outline">or </span>
        <a href="/admin/workouts/upload" className="text-xs text-primary underline">
          upload CSV/Excel
        </a>
      </div>
    </div>
  );
}
