"use client";

import { useState, useEffect } from "react";
import { getSubstitutionCandidates } from "@/app/actions";

interface ExerciseSubstitutionPanelProps {
  onConfirm: (replacements: string[]) => Promise<void>;
  onCancel: () => void;
}

export function ExerciseSubstitutionPanel({
  onConfirm,
  onCancel,
}: ExerciseSubstitutionPanelProps) {
  const [candidates, setCandidates] = useState<string[]>([]);
  const [input1, setInput1] = useState("");
  const [input2, setInput2] = useState("");
  const [showSecond, setShowSecond] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSubstitutionCandidates().then(setCandidates);
  }, []);

  function filter(q: string): string[] {
    if (q.length === 0) return candidates.slice(0, 5);
    return candidates
      .filter((c) => c.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 8);
  }

  async function handleConfirm() {
    const r1 = input1.trim();
    const r2 = input2.trim();
    if (!r1) return;
    setSaving(true);
    try {
      await onConfirm(showSecond && r2 ? [r1, r2] : [r1]);
    } finally {
      setSaving(false);
    }
  }

  const chips1 = filter(input1);
  const chips2 = filter(input2);

  return (
    <div className="mt-1 flex flex-col gap-2 border border-outline-variant bg-surface-container p-3">
      <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
        Swap exercise for today
      </p>

      <div>
        <input
          type="text"
          autoFocus
          placeholder="Search or type exercise..."
          value={input1}
          onChange={(e) => setInput1(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleConfirm();
            if (e.key === "Escape") onCancel();
          }}
          className="w-full border-0 border-b border-outline-variant bg-transparent py-1 text-sm font-bold text-on-surface placeholder:text-outline focus:border-primary focus:ring-0"
        />
        {chips1.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {chips1.map((c) => (
              <button
                key={c}
                onClick={() => setInput1(c)}
                className="bg-surface-container-highest px-2 py-0.5 text-[9px] font-bold text-on-surface-variant hover:text-on-surface"
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {showSecond && (
        <div>
          <input
            type="text"
            placeholder="Second movement..."
            value={input2}
            onChange={(e) => setInput2(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onCancel();
            }}
            className="w-full border-0 border-b border-outline-variant bg-transparent py-1 text-sm font-bold text-on-surface placeholder:text-outline focus:border-primary focus:ring-0"
          />
          {chips2.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {chips2.map((c) => (
                <button
                  key={c}
                  onClick={() => setInput2(c)}
                  className="bg-surface-container-highest px-2 py-0.5 text-[9px] font-bold text-on-surface-variant hover:text-on-surface"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!showSecond && (
        <button
          onClick={() => setShowSecond(true)}
          className="self-start text-[9px] font-bold uppercase tracking-widest text-outline hover:text-on-surface"
        >
          + add second movement
        </button>
      )}

      <div className="flex items-center justify-end gap-3 pt-1">
        <button
          onClick={onCancel}
          className="text-[9px] font-bold uppercase tracking-widest text-outline hover:text-on-surface"
        >
          CANCEL
        </button>
        <button
          onClick={handleConfirm}
          disabled={!input1.trim() || saving}
          className="squishy bg-primary px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-on-primary disabled:opacity-50"
        >
          {saving ? "..." : "CONFIRM"}
        </button>
      </div>
    </div>
  );
}
