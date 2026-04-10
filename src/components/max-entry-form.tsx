"use client";

import { useState } from "react";
import { setUserMax } from "@/app/actions";
import { toast } from "sonner";

interface MaxEntryFormProps {
  liftName: string;
  currentMax?: number | null;
}

export function MaxEntryForm({ liftName: initialLiftName, currentMax }: MaxEntryFormProps) {
  const [liftName, setLiftName] = useState(initialLiftName);
  const [weight, setWeight] = useState(currentMax?.toString() ?? "");
  const [loading, setLoading] = useState(false);

  const showLiftInput = !initialLiftName;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = parseFloat(weight);
    if (isNaN(val) || val <= 0 || !liftName.trim()) return;

    setLoading(true);
    try {
      await setUserMax(liftName.trim(), val);
      toast.success(`1RM for ${liftName.trim()} set to ${val}kg`);
      if (showLiftInput) {
        setLiftName("");
        setWeight("");
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      {showLiftInput && (
        <div className="flex-1">
          <label className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            LIFT NAME
          </label>
          <input
            value={liftName}
            onChange={(e) => setLiftName(e.target.value)}
            placeholder="e.g. Squat snatch"
            className="mt-1 w-full border-0 border-b-2 border-outline-variant bg-surface-container-lowest p-0 py-2 font-headline text-lg font-bold text-on-surface transition-colors placeholder:text-outline focus:border-primary focus:ring-0"
          />
        </div>
      )}
      <div className={showLiftInput ? "w-28" : "flex-1"}>
        <label className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          {showLiftInput ? "1RM (KG)" : "UPDATE 1RM (KG)"}
        </label>
        <input
          type="number"
          step="0.5"
          min="0"
          placeholder="kg"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="mt-1 w-full border-0 border-b-2 border-outline-variant bg-surface-container-lowest p-0 py-2 font-headline text-lg font-bold text-on-surface transition-colors placeholder:text-outline focus:border-primary focus:ring-0"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="squishy bg-surface-variant px-6 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-surface transition-colors hover:bg-surface-bright disabled:opacity-50"
      >
        {currentMax ? "UPDATE" : "SET"}
      </button>
    </form>
  );
}
