"use client";

import { useState } from "react";
import { addWorkout } from "@/app/actions";
import { parseWorkoutText } from "@/lib/workout-parser";
import { toast } from "sonner";

const EXAMPLE_TEXT = `Monday
WARM UP
PVC + Squat drills
PRIMER
3 sets:
3 muscle cleans
3 front squats
OLYMPIC LIFT
Squat clean
1@50%
1@60%
1@70%
1@75%
5x1@80%
STRENGTH 1
3 sets:
6 back squats
12 walking lunges
STRENGTH 2
3 sets:
12 press ups
12 DB bench press`;

export default function AdminWorkoutsPage() {
  const [date, setDate] = useState("");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ReturnType<
    typeof parseWorkoutText
  > | null>(null);
  const [loading, setLoading] = useState(false);

  function handlePreview() {
    if (!text.trim() || !date) {
      toast.error("Enter a date and workout text");
      return;
    }
    const parsed = parseWorkoutText(text, date);
    setPreview(parsed);
  }

  async function handleSubmit() {
    if (!preview) return;
    setLoading(true);
    try {
      await addWorkout(preview);
      toast.success(`Workout added for ${preview.title}`);
      setText("");
      setDate("");
      setPreview(null);
    } catch {
      toast.error("Failed to save. May already exist for that date.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="mb-2 font-label text-xs uppercase tracking-[0.2em] text-primary">
          COACH TOOLS
        </p>
        <h2 className="font-headline text-4xl font-bold uppercase tracking-tighter">
          ADD WORKOUTS
        </h2>
      </section>

      <div className="bg-surface-container-high p-6">
        <p className="mb-4 font-headline text-sm font-bold uppercase tracking-widest">
          WORKOUT ENTRY
        </p>

        <div className="flex flex-col gap-6">
          <div>
            <label className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              DATE
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full border-0 border-b-2 border-outline-variant bg-surface-container-lowest p-0 py-2 font-headline font-bold text-on-surface transition-colors focus:border-primary focus:ring-0"
            />
          </div>
          <div>
            <label className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              WORKOUT TEXT
            </label>
            <textarea
              rows={14}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={EXAMPLE_TEXT}
              className="mt-1 w-full border-0 border-b-2 border-outline-variant bg-surface-container-lowest p-2 font-mono text-xs text-on-surface transition-colors placeholder:text-outline focus:border-primary focus:ring-0"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handlePreview}
              className="squishy flex-1 bg-surface-variant py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-surface transition-colors hover:bg-surface-bright"
            >
              PREVIEW
            </button>
            <button
              onClick={() => setText(EXAMPLE_TEXT)}
              className="squishy bg-surface-container-highest px-6 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-variant"
            >
              LOAD EXAMPLE
            </button>
          </div>
        </div>
      </div>

      {preview && (
        <div className="bg-surface-container-high p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="bg-primary-container px-3 py-1 font-headline text-sm font-bold text-on-primary-fixed">
              PREVIEW
            </span>
            <span className="font-label text-xs tracking-widest text-on-surface-variant">
              {preview.date}
            </span>
          </div>

          <h3 className="mb-6 font-headline text-2xl font-bold uppercase tracking-tight">
            {preview.title}
          </h3>

          <div className="mb-6 flex flex-col gap-4">
            {preview.sections.map((section, i) => (
              <div key={i} className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {section.type}
                </span>
                {section.liftName && (
                  <p className="font-headline font-bold text-primary">
                    {section.liftName}
                  </p>
                )}
                {section.sets && (
                  <p className="text-xs text-on-surface-variant">
                    {section.sets}
                  </p>
                )}
                {section.exercises.map((ex, j) => (
                  <div key={j} className="text-sm">
                    {ex.percentageSets ? (
                      <div className="flex flex-col gap-0.5 pl-2">
                        {ex.percentageSets.map((ps, k) => (
                          <span
                            key={k}
                            className="text-xs text-on-surface-variant"
                          >
                            {ps.reps}@ {ps.percentage}%
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-on-surface/80">{ex.name}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="digital-texture w-full py-4 font-headline font-black uppercase tracking-widest text-on-primary-fixed transition-transform duration-150 disabled:opacity-50 active:scale-95"
          >
            {loading ? "SAVING..." : "SAVE WORKOUT"}
          </button>
        </div>
      )}
    </div>
  );
}
