"use client";

import { useState, useRef, useEffect } from "react";
import { saveExerciseSubstitution, deleteExerciseSubstitution, logLift } from "@/app/actions";
import { LogExerciseInline } from "@/components/log-exercise-inline";
import { ExerciseSubstitutionPanel } from "@/components/exercise-substitution-panel";
import { toast } from "sonner";
import { useRestTimer } from "@/components/rest-timer";
import { usePRCelebration } from "@/components/pr-celebration";

interface PreviousWeight {
  weight: number;
  reps: number | null;
  repsText?: string | null;
  unit: string;
  prevWeight: number | null;
  prevReps: number | null;
  prevRepsText?: string | null;
}

interface SubstitutableExerciseRowProps {
  date: string;
  workoutId: number;
  exerciseName: string;
  sectionType: string;
  previousWeights?: Record<string, PreviousWeight>;
  expectedSets?: number;
  defaultReps?: number;
  loggedSetsToday?: Record<string, number>;
  initialReplacements: string[] | null;
}

export function SubstitutableExerciseRow({
  date,
  workoutId,
  exerciseName,
  sectionType,
  previousWeights,
  expectedSets,
  defaultReps,
  loggedSetsToday,
  initialReplacements,
}: SubstitutableExerciseRowProps) {
  const { startTimer } = useRestTimer();
  const { celebrate } = usePRCelebration();
  const [panelOpen, setPanelOpen] = useState(false);
  const [replacements, setReplacements] = useState<string[] | null>(initialReplacements);
  const [undoing, setUndoing] = useState(false);

  // Complex (2-replacement) logging state
  const [complexOpen, setComplexOpen] = useState(false);
  const [complexWeight, setComplexWeight] = useState("");
  const [complexRep1, setComplexRep1] = useState("");
  const [complexRep2, setComplexRep2] = useState("");
  const [complexLogging, setComplexLogging] = useState(false);
  const [complexLoggedSets, setComplexLoggedSets] = useState<{ weight: number; repsText: string }[]>([]);
  const complexFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!complexOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (complexFormRef.current && !complexFormRef.current.contains(e.target as Node)) {
        setComplexOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [complexOpen]);

  async function handleConfirm(newReplacements: string[]) {
    await saveExerciseSubstitution(workoutId, date, exerciseName, newReplacements);
    setReplacements(newReplacements);
    setPanelOpen(false);
  }

  async function handleUndo() {
    setUndoing(true);
    try {
      await deleteExerciseSubstitution(workoutId, date, exerciseName);
      setReplacements(null);
    } catch {
      toast.error("Failed to remove substitution");
    } finally {
      setUndoing(false);
    }
  }

  async function handleLogComplex() {
    if (!replacements || replacements.length < 2) return;
    const w = parseFloat(complexWeight) || 0;
    if (w < 0) return;
    const r1 = parseInt(complexRep1) || 0;
    const r2 = parseInt(complexRep2) || 0;
    const complexName = `${replacements[0]} + ${replacements[1]}`;
    const repsText = r1 > 0 || r2 > 0 ? `${r1}+${r2}` : undefined;
    const totalReps = r1 + r2 || undefined;
    const isBarbellSection =
      sectionType === "OLYMPIC LIFT" ||
      sectionType.startsWith("STRENGTH ") ||
      sectionType === "ACCESSORY";

    setComplexLogging(true);
    try {
      const result = await logLift({
        workoutId,
        date,
        liftName: complexName,
        weight: w,
        reps: totalReps,
        repsText,
      });
      setComplexLoggedSets((prev) => [...prev, { weight: w, repsText: repsText ?? "" }]);
      setComplexOpen(false);
      if (result.isPR) {
        celebrate({ liftName: complexName, weight: w, unit: "kg", previousBest: result.previousBest });
      } else {
        toast.success(`${w}kg logged`);
      }
      if (isBarbellSection) startTimer(sectionType);
    } catch {
      toast.error("Failed to log");
    } finally {
      setComplexLogging(false);
    }
  }

  function openComplex(pw: PreviousWeight | undefined) {
    setComplexWeight(pw?.weight.toString() ?? "");
    if (pw?.repsText) {
      const parts = pw.repsText.split("+");
      setComplexRep1(parts[0] ?? "");
      setComplexRep2(parts[1] ?? "");
    } else {
      setComplexRep1("");
      setComplexRep2("");
    }
    setComplexOpen(true);
  }

  // 2-replacement: render as complex
  if (replacements && replacements.length === 2) {
    const complexName = `${replacements[0]} + ${replacements[1]}`;
    const pw = previousWeights?.[complexName];
    const delta = pw?.prevWeight != null ? pw.weight - pw.prevWeight : null;
    const prevRepsDisplay = pw?.repsText ?? (pw?.reps != null ? String(pw.reps) : null);
    const initialComplexLogged = loggedSetsToday?.[complexName] ?? 0;
    const totalComplexLogged = initialComplexLogged + complexLoggedSets.length;
    const allComplexDone = expectedSets ? totalComplexLogged >= expectedSets : false;

    return (
      <div className="flex flex-col gap-1 py-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-on-surface-variant line-through opacity-40">
            {exerciseName}
          </span>
          <button
            onClick={handleUndo}
            disabled={undoing}
            className="text-[9px] font-bold uppercase tracking-widest text-outline hover:text-on-surface disabled:opacity-50"
          >
            {undoing ? "..." : "undo sub"}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-primary">↳</span>
              <span className="font-bold text-on-surface">{complexName}</span>
              <span className="text-[8px] font-bold uppercase tracking-widest text-outline">
                complex
              </span>
            </div>
            {pw && (
              <span className="ml-4 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                PREV: {pw.weight}kg{prevRepsDisplay ? ` × ${prevRepsDisplay}` : ""}
                {delta != null && delta !== 0 && (
                  <span className={delta > 0 ? "text-primary" : "text-red-400"}>
                    <span className="material-symbols-outlined align-middle text-xs">
                      {delta > 0 ? "arrow_upward" : "arrow_downward"}
                    </span>
                    {Math.abs(delta).toFixed(1)}kg
                  </span>
                )}
              </span>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {complexLoggedSets.length > 0 && (
              <div className="flex flex-wrap justify-end gap-1">
                {complexLoggedSets.map((s, i) => (
                  <span
                    key={i}
                    className="bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary"
                  >
                    {s.weight}kg{s.repsText ? ` × ${s.repsText}` : ""}
                  </span>
                ))}
              </div>
            )}
            {!complexOpen ? (
              allComplexDone ? (
                <button
                  onClick={() => openComplex(pw)}
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
                  onClick={() => openComplex(pw)}
                  className="squishy flex items-center gap-1 bg-surface-variant px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface transition-colors hover:bg-surface-bright"
                >
                  <span className="material-symbols-outlined text-sm">add_task</span>
                  {totalComplexLogged > 0 ? `SET ${totalComplexLogged + 1}` : "LOG"}
                </button>
              )
            ) : (
              <div ref={complexFormRef} className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="kg"
                  value={complexWeight}
                  onChange={(e) => setComplexWeight(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLogComplex();
                    if (e.key === "Escape") setComplexOpen(false);
                  }}
                  className="w-14 border-0 border-b border-outline-variant bg-transparent p-0 py-1 text-center font-headline text-sm font-bold text-on-surface placeholder:text-outline focus:border-primary focus:ring-0"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="r1"
                  value={complexRep1}
                  onChange={(e) => setComplexRep1(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLogComplex();
                    if (e.key === "Escape") setComplexOpen(false);
                  }}
                  className="w-10 border-0 border-b border-outline-variant bg-transparent p-0 py-1 text-center font-headline text-sm font-bold text-on-surface placeholder:text-outline focus:border-primary focus:ring-0"
                />
                <span className="text-[10px] text-on-surface-variant">+</span>
                <input
                  type="number"
                  min="0"
                  placeholder="r2"
                  value={complexRep2}
                  onChange={(e) => setComplexRep2(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLogComplex();
                    if (e.key === "Escape") setComplexOpen(false);
                  }}
                  className="w-10 border-0 border-b border-outline-variant bg-transparent p-0 py-1 text-center font-headline text-sm font-bold text-on-surface placeholder:text-outline focus:border-primary focus:ring-0"
                />
                <button
                  onClick={handleLogComplex}
                  disabled={complexLogging}
                  className="squishy bg-primary-container px-2 py-1 text-[10px] font-bold text-on-primary-fixed disabled:opacity-50"
                >
                  {complexLogging ? "..." : "OK"}
                </button>
                <button
                  onClick={() => setComplexOpen(false)}
                  className="text-outline hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 1-replacement: render as single substitute exercise
  if (replacements) {
    return (
      <div className="flex flex-col gap-1 py-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-on-surface-variant line-through opacity-40">
            {exerciseName}
          </span>
          <button
            onClick={handleUndo}
            disabled={undoing}
            className="text-[9px] font-bold uppercase tracking-widest text-outline hover:text-on-surface disabled:opacity-50"
          >
            {undoing ? "..." : "undo sub"}
          </button>
        </div>
        {replacements.map((name) => {
          const pw = previousWeights?.[name];
          const delta = pw?.prevWeight != null ? pw.weight - pw.prevWeight : null;
          return (
            <div key={name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-primary">↳</span>
                <span className="font-bold text-on-surface">{name}</span>
                <span className="text-[8px] font-bold uppercase tracking-widest text-outline">
                  sub
                </span>
                {pw && (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    PREV: {pw.weight}kg{pw.reps ? ` × ${pw.reps}` : ""}
                    {delta != null && delta !== 0 && (
                      <span className={delta > 0 ? "text-primary" : "text-red-400"}>
                        <span className="material-symbols-outlined align-middle text-xs">
                          {delta > 0 ? "arrow_upward" : "arrow_downward"}
                        </span>
                        {Math.abs(delta).toFixed(1)}kg
                      </span>
                    )}
                  </span>
                )}
              </div>
              <LogExerciseInline
                date={date}
                workoutId={workoutId}
                exerciseName={name}
                lastWeight={pw?.weight}
                lastReps={pw?.reps ?? undefined}
                defaultReps={defaultReps}
                sectionType={sectionType}
                expectedSets={expectedSets}
                initialLoggedCount={loggedSetsToday?.[name] ?? 0}
              />
            </div>
          );
        })}
      </div>
    );
  }

  const pw = previousWeights?.[exerciseName];
  const delta = pw?.prevWeight != null ? pw.weight - pw.prevWeight : null;

  return (
    <div>
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPanelOpen((o) => !o)}
            className="font-bold text-on-surface underline decoration-dotted underline-offset-2 hover:text-primary"
          >
            {exerciseName}
          </button>
          {pw && (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              PREV: {pw.weight}kg{pw.reps ? ` × ${pw.reps}` : ""}
              {delta != null && delta !== 0 && (
                <span className={delta > 0 ? "text-primary" : "text-red-400"}>
                  <span className="material-symbols-outlined align-middle text-xs">
                    {delta > 0 ? "arrow_upward" : "arrow_downward"}
                  </span>
                  {Math.abs(delta).toFixed(1)}kg
                </span>
              )}
            </span>
          )}
        </div>
        <LogExerciseInline
          date={date}
          workoutId={workoutId}
          exerciseName={exerciseName}
          lastWeight={pw?.weight}
          lastReps={pw?.reps ?? undefined}
          defaultReps={defaultReps}
          sectionType={sectionType}
          expectedSets={expectedSets}
          initialLoggedCount={loggedSetsToday?.[exerciseName] ?? 0}
        />
      </div>
      {panelOpen && (
        <ExerciseSubstitutionPanel
          onConfirm={handleConfirm}
          onCancel={() => setPanelOpen(false)}
        />
      )}
    </div>
  );
}
