"use client";

import { useState } from "react";
import type { WodFormat, WodScoreType, WodMovement } from "@/db/schema";

interface WodSectionEditorProps {
  wodFormat?: WodFormat;
  wodScoreType?: WodScoreType;
  wodRounds?: number;
  wodInterval?: number;
  timeCap?: number;
  wodName?: string;
  rxWeights?: string;
  wodMovements: WodMovement[];
  wodDescription?: string;
  onChange: (data: {
    wodFormat?: WodFormat;
    wodScoreType?: WodScoreType;
    wodRounds?: number;
    wodInterval?: number;
    timeCap?: number;
    wodName?: string;
    rxWeights?: string;
    wodMovements: WodMovement[];
    wodDescription?: string;
  }) => void;
}

const WOD_FORMATS: { value: WodFormat; label: string }[] = [
  { value: "FOR_TIME", label: "FOR TIME" },
  { value: "ROUNDS_FOR_TIME", label: "ROUNDS FOR TIME" },
  { value: "AMRAP", label: "AMRAP" },
  { value: "EMOM", label: "EMOM" },
  { value: "DEATH_BY", label: "DEATH BY" },
  { value: "INTERVAL", label: "INTERVAL" },
  { value: "TABATA", label: "TABATA" },
  { value: "MAX_LOAD", label: "MAX LOAD" },
];

const SCORE_TYPES: { value: WodScoreType; label: string }[] = [
  { value: "TIME", label: "TIME" },
  { value: "ROUNDS_REPS", label: "ROUNDS + REPS" },
  { value: "LOAD", label: "LOAD" },
  { value: "CALS", label: "CALS" },
  { value: "DISTANCE", label: "DISTANCE" },
  { value: "INTERVAL", label: "INTERVAL" },
];

function formatTimeCap(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${m}:00`;
}

function parseTimeCap(value: string): number {
  const parts = value.split(":");
  const m = parseInt(parts[0]) || 0;
  const s = parseInt(parts[1]) || 0;
  return m * 60 + s;
}

export function WodSectionEditor({
  wodFormat,
  wodScoreType,
  wodRounds,
  wodInterval,
  timeCap,
  wodName,
  rxWeights,
  wodMovements,
  wodDescription,
  onChange,
}: WodSectionEditorProps) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  function update(partial: Partial<WodSectionEditorProps>) {
    onChange({
      wodFormat, wodScoreType, wodRounds, wodInterval, timeCap,
      wodName, rxWeights, wodMovements, wodDescription,
      ...partial,
    });
  }

  function updateMovement(index: number, updated: WodMovement) {
    const next = [...wodMovements];
    next[index] = updated;
    update({ wodMovements: next });
  }

  function removeMovement(index: number) {
    update({ wodMovements: wodMovements.filter((_, i) => i !== index) });
  }

  function addMovement() {
    update({
      wodMovements: [...wodMovements, { name: "", reps: "", weight: null, unit: null, note: null }],
    });
  }

  const showRounds = wodFormat === "ROUNDS_FOR_TIME" || wodFormat === "EMOM" || wodFormat === "TABATA" || wodFormat === "DEATH_BY";
  const showInterval = wodFormat === "EMOM" || wodFormat === "TABATA" || wodFormat === "INTERVAL";

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest" style={{ backgroundColor: "#dc262620", color: "#f87171" }}>
          WOD
        </span>
        {wodName && (
          <span className="text-xs font-bold text-on-surface">{wodName}</span>
        )}
      </div>

      <div className="bg-surface-container overflow-hidden">
        {/* Format, Score Type, Time Cap row */}
        <div className="flex border-b border-surface-container-highest">
          <div className="flex-1 border-r border-surface-container-highest px-3 py-2">
            <span className="block text-[9px] font-bold uppercase tracking-widest text-outline">FORMAT</span>
            <select
              className="mt-1 w-full bg-transparent text-xs font-bold text-on-surface outline-none"
              value={wodFormat ?? ""}
              onChange={(e) => update({ wodFormat: e.target.value as WodFormat })}
            >
              <option value="">—</option>
              {WOD_FORMATS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 border-r border-surface-container-highest px-3 py-2">
            <span className="block text-[9px] font-bold uppercase tracking-widest text-outline">SCORE TYPE</span>
            <select
              className="mt-1 w-full bg-transparent text-xs font-bold text-on-surface outline-none"
              value={wodScoreType ?? ""}
              onChange={(e) => update({ wodScoreType: e.target.value as WodScoreType })}
            >
              <option value="">—</option>
              {SCORE_TYPES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="px-3 py-2">
            <span className="block text-[9px] font-bold uppercase tracking-widest text-outline">TIME CAP</span>
            <input
              className="mt-1 w-16 bg-transparent text-xs font-bold text-on-surface outline-none"
              value={timeCap ? formatTimeCap(timeCap) : ""}
              onChange={(e) => update({ timeCap: parseTimeCap(e.target.value) })}
              placeholder="MM:SS"
            />
          </div>
        </div>

        {/* Rounds / Interval row (conditional) */}
        {(showRounds || showInterval) && (
          <div className="flex border-b border-surface-container-highest">
            {showRounds && (
              <div className="flex-1 border-r border-surface-container-highest px-3 py-2">
                <span className="block text-[9px] font-bold uppercase tracking-widest text-outline">ROUNDS</span>
                <input
                  type="number"
                  className="mt-1 w-16 bg-transparent text-xs font-bold text-on-surface outline-none"
                  value={wodRounds ?? ""}
                  onChange={(e) => update({ wodRounds: parseInt(e.target.value) || undefined })}
                />
              </div>
            )}
            {showInterval && (
              <div className="flex-1 px-3 py-2">
                <span className="block text-[9px] font-bold uppercase tracking-widest text-outline">INTERVAL (sec)</span>
                <input
                  type="number"
                  className="mt-1 w-16 bg-transparent text-xs font-bold text-on-surface outline-none"
                  value={wodInterval ?? ""}
                  onChange={(e) => update({ wodInterval: parseInt(e.target.value) || undefined })}
                />
              </div>
            )}
          </div>
        )}

        {/* Movements */}
        <div className="px-3 py-2">
          {wodMovements.map((mov, i) => (
            <div key={i} className="flex items-center gap-2 border-b border-surface-container-highest py-2">
              {editingIdx === i ? (
                <>
                  <input
                    className="w-16 bg-surface-container-high px-2 py-1 text-center text-xs font-bold text-primary outline-none"
                    value={mov.reps}
                    onChange={(e) => updateMovement(i, { ...mov, reps: e.target.value })}
                    placeholder="reps"
                    autoFocus
                  />
                  <input
                    className="flex-1 bg-surface-container-high px-2 py-1 text-xs text-on-surface outline-none"
                    value={mov.name}
                    onChange={(e) => updateMovement(i, { ...mov, name: e.target.value })}
                    placeholder="Movement"
                  />
                  <input
                    className="w-24 bg-surface-container-high px-2 py-1 text-right text-xs text-outline outline-none"
                    value={mov.weight ?? ""}
                    onChange={(e) => updateMovement(i, { ...mov, weight: e.target.value || null })}
                    placeholder="weight"
                  />
                  <button onClick={() => setEditingIdx(null)} className="text-xs text-primary">done</button>
                </>
              ) : (
                <>
                  <span className="shrink-0 whitespace-nowrap text-sm font-bold text-primary">{mov.reps}</span>
                  <span className="flex-1 text-xs text-on-surface">{mov.name || "—"}</span>
                  {mov.weight && <span className="text-xs text-outline">{mov.weight}</span>}
                  {mov.note && <span className="text-[9px] italic text-outline">{mov.note}</span>}
                  <button onClick={() => setEditingIdx(i)} className="text-xs text-outline hover:text-primary">
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                  <button onClick={() => removeMovement(i)} className="text-xs text-outline hover:text-error">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </>
              )}
            </div>
          ))}
          <button
            onClick={addMovement}
            className="mt-2 text-[10px] font-bold uppercase tracking-widest text-primary"
          >
            + Add movement
          </button>
        </div>

        {/* RX Weights */}
        <div className="flex items-center justify-between border-t border-surface-container-highest px-3 py-2">
          <span className="text-[9px] font-bold uppercase tracking-widest text-outline">RX WEIGHTS</span>
          <input
            className="bg-transparent text-right text-xs text-on-surface-variant outline-none"
            value={rxWeights ?? ""}
            onChange={(e) => update({ rxWeights: e.target.value })}
            placeholder="e.g. 60/42.5kg"
          />
        </div>
      </div>
    </div>
  );
}
