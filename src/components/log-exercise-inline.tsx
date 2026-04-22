"use client";

import { useState, useCallback } from "react";
import { logLift, getLoggedSetsDetailForDate, deleteLoggedSet, updateLoggedSet } from "@/app/actions";
import { toast } from "sonner";
import { useRestTimer } from "@/components/rest-timer";
import { usePRCelebration } from "@/components/pr-celebration";

interface LoggedSet {
  weight: number;
  reps?: number;
}

interface ServerSet {
  id: number;
  weight: number;
  reps: number | null;
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
  const isBarbellSection = sectionType === "OLYMPIC LIFT" || sectionType.startsWith("STRENGTH ") || sectionType === "ACCESSORY";
  const [expanded, setExpanded] = useState(false);
  const [singleOpen, setSingleOpen] = useState(false);
  const [weight, setWeight] = useState(lastWeight?.toString() ?? "");
  const [loading, setLoading] = useState(false);
  const [loggedSets, setLoggedSets] = useState<LoggedSet[]>([]);
  const [serverSets, setServerSets] = useState<ServerSet[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingServerId, setEditingServerId] = useState<number | null>(null);
  const [editServerWeight, setEditServerWeight] = useState("");
  const [savingEditId, setSavingEditId] = useState<number | null>(null);
  const [loggingAll, setLoggingAll] = useState(false);

  const totalLogged = serverSets.length > 0 ? serverSets.length : initialLoggedCount + loggedSets.length;
  const allSetsLogged = expectedSets ? totalLogged >= expectedSets : false;
  const hasMultiSets = expectedSets && expectedSets > 1;

  // Multi-set row state
  const [setWeights, setSetWeights] = useState<string[]>(
    Array.from({ length: expectedSets ?? 0 }, () => lastWeight?.toString() ?? "")
  );
  const [loadingSetIdx, setLoadingSetIdx] = useState<number | null>(null);

  const fetchServerSets = useCallback(async () => {
    const sets = await getLoggedSetsDetailForDate(date, exerciseName);
    setServerSets(sets);
    // Logged rows mirror server. Unlogged rows keep whatever the user typed so
    // they can fill every row first then OK each one without losing input when
    // the list re-fetches after each log.
    setSetWeights((prev) =>
      Array.from({ length: expectedSets ?? 0 }, (_, i) => {
        if (sets[i]) return sets[i].weight.toString();
        return prev[i] && prev[i].length > 0 ? prev[i] : (lastWeight?.toString() ?? "");
      })
    );
  }, [date, exerciseName, expectedSets, lastWeight]);

  async function handleLogSingle() {
    const w = parseFloat(weight) || 0;
    if (w < 0) return;

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
      if (isBarbellSection) startTimer(sectionType);
    } catch {
      toast.error("Failed to log");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogSet(index: number) {
    const w = parseFloat(setWeights[index]) || 0;
    if (w < 0) return;

    setLoadingSetIdx(index);
    try {
      const result = await logLift({
        workoutId,
        date,
        liftName: exerciseName,
        weight: w,
        reps: effectiveReps ?? undefined,
      });
      setLoggedSets((prev) => [...prev, { weight: w, reps: effectiveReps }]);
      await fetchServerSets();
      if (result.isPR) {
        celebrate({ liftName: exerciseName, weight: w, unit: "kg", previousBest: result.previousBest });
      } else {
        toast.success(`Set ${index + 1} — ${w}kg logged`);
      }
      if (isBarbellSection) startTimer(sectionType);
    } catch {
      toast.error("Failed to log");
    } finally {
      setLoadingSetIdx(null);
    }
  }

  async function handleDeleteSet(logId: number) {
    setDeletingId(logId);
    try {
      await deleteLoggedSet(logId);
      await fetchServerSets();
      toast.success("Set removed");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleLogAll() {
    if (!expectedSets) return;
    const startIdx = serverSets.length;
    const toLog: { idx: number; w: number }[] = [];
    for (let i = startIdx; i < expectedSets; i++) {
      const w = parseFloat(setWeights[i] ?? "") || 0;
      if (w >= 0) toLog.push({ idx: i, w });
    }
    if (toLog.length === 0) {
      toast.error("No weights to log");
      return;
    }
    setLoggingAll(true);
    try {
      let lastPR: { weight: number; previousBest: number | null } | null = null;
      for (const { w } of toLog) {
        const result = await logLift({
          workoutId,
          date,
          liftName: exerciseName,
          weight: w,
          reps: effectiveReps ?? undefined,
        });
        if (result.isPR) lastPR = { weight: w, previousBest: result.previousBest };
      }
      await fetchServerSets();
      if (lastPR) {
        celebrate({ liftName: exerciseName, weight: lastPR.weight, unit: "kg", previousBest: lastPR.previousBest });
      } else {
        toast.success(`${toLog.length} sets logged`);
      }
      if (isBarbellSection) startTimer(sectionType);
    } catch {
      toast.error("Failed to log");
      await fetchServerSets();
    } finally {
      setLoggingAll(false);
    }
  }

  async function handleSaveEdit(logId: number) {
    const w = parseFloat(editServerWeight);
    if (isNaN(w) || w < 0) return;
    setSavingEditId(logId);
    try {
      await updateLoggedSet(logId, w);
      await fetchServerSets();
      setEditingServerId(null);
      setEditServerWeight("");
      toast.success(`Updated to ${w}kg`);
    } catch {
      toast.error("Failed to update");
    } finally {
      setSavingEditId(null);
    }
  }

  // Multi-set expanded view
  if (hasMultiSets && expanded) {
    const remainingSlots = Math.max(0, expectedSets! - serverSets.length);
    return (
      <>
      <div className="fixed inset-0 z-10" onClick={() => setExpanded(false)} />
      <div className="relative z-20 flex flex-col gap-1.5">
        {/* Logged sets from server */}
        {serverSets.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <span className="w-10 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              S{i + 1}
            </span>
            {editingServerId === s.id ? (
              <>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={editServerWeight}
                  onChange={(e) => setEditServerWeight(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit(s.id);
                    if (e.key === "Escape") {
                      setEditingServerId(null);
                      setEditServerWeight("");
                    }
                  }}
                  className="w-16 border-0 border-b border-outline-variant bg-transparent p-0 py-1 text-center font-headline text-sm font-bold text-on-surface placeholder:text-outline focus:border-primary focus:ring-0"
                />
                {s.reps && (
                  <span className="text-[10px] font-bold text-on-surface-variant">×{s.reps}</span>
                )}
                <button
                  onClick={() => handleSaveEdit(s.id)}
                  disabled={savingEditId === s.id}
                  className="squishy bg-primary-container px-2 py-1 text-[10px] font-bold text-on-primary-fixed disabled:opacity-50"
                >
                  {savingEditId === s.id ? "..." : "OK"}
                </button>
                <button
                  onClick={() => {
                    setEditingServerId(null);
                    setEditServerWeight("");
                  }}
                  className="text-outline hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                  <span
                    className="material-symbols-outlined text-sm"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                  {s.weight}kg{s.reps ? ` ×${s.reps}` : ""}
                </span>
                <button
                  onClick={() => {
                    setEditingServerId(s.id);
                    setEditServerWeight(s.weight.toString());
                  }}
                  className="ml-auto text-outline hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                </button>
                <button
                  onClick={() => handleDeleteSet(s.id)}
                  disabled={deletingId === s.id}
                  className="text-outline hover:text-red-400 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">
                    {deletingId === s.id ? "hourglass_empty" : "close"}
                  </span>
                </button>
              </>
            )}
          </div>
        ))}
        {/* Input rows for remaining sets */}
        {Array.from({ length: remainingSlots }, (_, ri) => {
          const slotIdx = serverSets.length + ri;
          return (
            <div key={`input-${ri}`} className="flex items-center gap-2">
              <span className="w-10 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                S{slotIdx + 1}
              </span>
              <input
                type="number"
                step="0.5"
                min="0"
                placeholder="kg"
                value={setWeights[slotIdx] ?? lastWeight?.toString() ?? ""}
                onChange={(e) => {
                  const next = [...setWeights];
                  while (next.length <= slotIdx) next.push(lastWeight?.toString() ?? "");
                  next[slotIdx] = e.target.value;
                  setSetWeights(next);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLogSet(slotIdx);
                }}
                className="w-16 border-0 border-b border-outline-variant bg-transparent p-0 py-1 text-center font-headline text-sm font-bold text-on-surface placeholder:text-outline focus:border-primary focus:ring-0"
              />
              {effectiveReps && (
                <span className="text-[10px] font-bold text-on-surface-variant">×{effectiveReps}</span>
              )}
              <button
                onClick={() => handleLogSet(slotIdx)}
                disabled={loadingSetIdx === slotIdx}
                className="squishy bg-primary-container px-2 py-1 text-[10px] font-bold text-on-primary-fixed disabled:opacity-50"
              >
                {loadingSetIdx === slotIdx ? "..." : "OK"}
              </button>
            </div>
          );
        })}
        <div className="mt-1 flex items-center justify-between gap-2">
          <button
            onClick={() => setExpanded(false)}
            className="text-[10px] font-bold uppercase tracking-widest text-outline hover:text-on-surface"
          >
            COLLAPSE
          </button>
          {remainingSlots > 1 && (
            <button
              onClick={handleLogAll}
              disabled={loggingAll}
              className="squishy bg-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-on-primary disabled:opacity-50"
            >
              {loggingAll ? "LOGGING..." : "LOG ALL"}
            </button>
          )}
        </div>
      </div>
      </>
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
            onClick={() => { fetchServerSets(); setExpanded(true); }}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary"
          >
            <span
              className="material-symbols-outlined text-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            {expectedSets}/{expectedSets} SETS
          </button>
        ) : (
          <button
            onClick={() => { fetchServerSets(); setExpanded(true); }}
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
