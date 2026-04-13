"use client";

import { useState } from "react";
import { logLift } from "@/app/actions";
import { toast } from "sonner";
import { useRestTimer } from "@/components/rest-timer";
import { usePRCelebration } from "@/components/pr-celebration";

interface LoggedSet {
  weight: number;
  reps?: number;
}

type InputMode = "weight" | "cals";

interface LogExerciseInlineProps {
  date: string;
  workoutId: number;
  exerciseName: string;
  lastWeight?: number;
  lastReps?: number;
  defaultReps?: number;
  sectionType?: string;
  expectedSets?: number;
  initialLoggedCount?: number;
  inputMode?: InputMode;
}

const CONDITIONING_PATTERNS = [
  /echo bike/i, /assault bike/i, /ski erg/i, /row$/i, /calorie/i, /cal /i,
  /\bcals?\b/i, /run$/i, /\d+m /i,
];

function detectInputMode(name: string): InputMode {
  if (CONDITIONING_PATTERNS.some((p) => p.test(name))) return "cals";
  return "weight";
}

export function LogExerciseInline({
  date,
  workoutId,
  exerciseName,
  lastWeight,
  lastReps,
  defaultReps,
  sectionType = "STRENGTH 1",
  expectedSets,
  initialLoggedCount = 0,
  inputMode: inputModeProp,
}: LogExerciseInlineProps) {
  const { startTimer } = useRestTimer();
  const { celebrate } = usePRCelebration();
  const mode = inputModeProp ?? detectInputMode(exerciseName);
  const effectiveReps = defaultReps ?? lastReps;
  const [expanded, setExpanded] = useState(false);
  const [singleOpen, setSingleOpen] = useState(false);
  const [weight, setWeight] = useState(lastWeight?.toString() ?? "");
  const [loading, setLoading] = useState(false);
  const [loggedSets, setLoggedSets] = useState<LoggedSet[]>([]);

  const totalLogged = initialLoggedCount + loggedSets.length;
  const allSetsLogged = expectedSets ? totalLogged >= expectedSets : false;
  const hasMultiSets = expectedSets && expectedSets > 1;

  // Multi-set row state
  const [setWeights, setSetWeights] = useState<string[]>(
    Array.from({ length: expectedSets ?? 0 }, () => lastWeight?.toString() ?? "")
  );
  const [setLogged, setSetLogged] = useState<boolean[]>(
    Array.from({ length: expectedSets ?? 0 }, (_, i) => i < initialLoggedCount)
  );
  const [loadingSetIdx, setLoadingSetIdx] = useState<number | null>(null);

  async function handleLogSingle() {
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0) return;

    setLoading(true);
    try {
      const finalReps = mode === "cals" ? Math.round(w) : effectiveReps ?? undefined;
      const result = await logLift({
        workoutId,
        date,
        liftName: exerciseName,
        weight: mode === "weight" ? w : 0,
        reps: finalReps,
        notes: mode === "cals" ? `${w} cals` : undefined,
      });
      setLoggedSets((prev) => [...prev, { weight: w, reps: finalReps }]);
      setSingleOpen(false);
      if (result.isPR && mode === "weight") {
        celebrate({ liftName: exerciseName, weight: w, unit: "kg", previousBest: result.previousBest });
      } else {
        toast.success(mode === "cals" ? `${w} cals logged` : `${w}kg logged`);
      }
      startTimer(sectionType);
    } catch {
      toast.error("Failed to log");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogSet(index: number) {
    const w = parseFloat(setWeights[index]);
    if (isNaN(w) || w <= 0) return;

    setLoadingSetIdx(index);
    try {
      const result = await logLift({
        workoutId,
        date,
        liftName: exerciseName,
        weight: w,
        reps: effectiveReps ?? undefined,
      });
      setSetLogged((prev) => {
        const next = [...prev];
        next[index] = true;
        return next;
      });
      setLoggedSets((prev) => [...prev, { weight: w, reps: effectiveReps }]);
      if (result.isPR) {
        celebrate({ liftName: exerciseName, weight: w, unit: "kg", previousBest: result.previousBest });
      } else {
        toast.success(`Set ${index + 1} — ${w}kg logged`);
      }
      startTimer(sectionType);
    } catch {
      toast.error("Failed to log");
    } finally {
      setLoadingSetIdx(null);
    }
  }

  // Multi-set expanded view
  if (hasMultiSets && expanded) {
    const allDone = setLogged.every(Boolean);
    return (
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: expectedSets! }, (_, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-10 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              S{i + 1}
            </span>
            {setLogged[i] ? (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                <span
                  className="material-symbols-outlined text-sm"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                {setWeights[i]}kg{effectiveReps ? ` ×${effectiveReps}` : ""}
              </span>
            ) : (
              <>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="kg"
                  value={setWeights[i]}
                  onChange={(e) => {
                    const next = [...setWeights];
                    next[i] = e.target.value;
                    setSetWeights(next);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLogSet(i);
                  }}
                  className="w-16 border-0 border-b border-outline-variant bg-transparent p-0 py-1 text-center font-headline text-sm font-bold text-on-surface placeholder:text-outline focus:border-primary focus:ring-0"
                />
                {effectiveReps && (
                  <span className="text-[10px] font-bold text-on-surface-variant">×{effectiveReps}</span>
                )}
                <button
                  onClick={() => handleLogSet(i)}
                  disabled={loadingSetIdx === i}
                  className="squishy bg-primary-container px-2 py-1 text-[10px] font-bold text-on-primary-fixed disabled:opacity-50"
                >
                  {loadingSetIdx === i ? "..." : "OK"}
                </button>
              </>
            )}
          </div>
        ))}
        {allDone && (
          <button
            onClick={() => setExpanded(false)}
            className="text-[10px] font-bold uppercase tracking-widest text-outline hover:text-on-surface"
          >
            COLLAPSE
          </button>
        )}
      </div>
    );
  }

  // Collapsed view
  const placeholder1 = mode === "cals" ? "cals" : "kg";

  return (
    <div className="flex flex-col items-end gap-1.5">
      {loggedSets.length > 0 && !hasMultiSets && (
        <div className="flex flex-wrap items-center justify-end gap-1">
          {loggedSets.map((s, i) => (
            <span
              key={i}
              className="bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary"
            >
              {mode === "cals"
                ? `${s.weight} cals`
                : `${s.weight}kg${s.reps ? ` x${s.reps}` : ""}`}
            </span>
          ))}
        </div>
      )}

      {hasMultiSets ? (
        allSetsLogged ? (
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary"
          >
            <span
              className="material-symbols-outlined text-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            {totalLogged}/{expectedSets} SETS
          </button>
        ) : (
          <button
            onClick={() => setExpanded(true)}
            className="squishy flex items-center gap-1 bg-surface-variant px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface transition-colors hover:bg-surface-bright"
          >
            <span className="material-symbols-outlined text-sm">add_task</span>
            {totalLogged > 0 ? `${totalLogged}/${expectedSets} SETS` : "LOG"}
          </button>
        )
      ) : !singleOpen ? (
        <button
          onClick={() => setSingleOpen(true)}
          className="squishy flex items-center gap-1 bg-surface-variant px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface transition-colors hover:bg-surface-bright"
        >
          <span className="material-symbols-outlined text-sm">add_task</span>
          {loggedSets.length > 0 ? `SET ${totalLogged + 1}` : "LOG"}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="number"
            step={mode === "cals" ? "1" : "0.5"}
            min="0"
            placeholder={placeholder1}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLogSingle();
              if (e.key === "Escape") setSingleOpen(false);
            }}
            className="w-16 border-0 border-b border-outline-variant bg-transparent p-0 py-1 text-center font-headline text-sm font-bold text-on-surface placeholder:text-outline focus:border-primary focus:ring-0"
          />
          {mode === "weight" && !defaultReps && (
            <input
              type="number"
              min="1"
              placeholder="reps"
              value={effectiveReps?.toString() ?? ""}
              onChange={() => {}}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLogSingle();
                if (e.key === "Escape") setSingleOpen(false);
              }}
              className="w-12 border-0 border-b border-outline-variant bg-transparent p-0 py-1 text-center font-headline text-sm font-bold text-on-surface placeholder:text-outline focus:border-primary focus:ring-0"
            />
          )}
          {defaultReps && mode === "weight" && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              ×{defaultReps}
            </span>
          )}
          <button
            onClick={handleLogSingle}
            disabled={loading}
            className="squishy bg-primary-container px-2 py-1 text-[10px] font-bold text-on-primary-fixed disabled:opacity-50"
          >
            {loading ? "..." : "OK"}
          </button>
          <button
            onClick={() => setSingleOpen(false)}
            className="text-outline hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}
    </div>
  );
}
