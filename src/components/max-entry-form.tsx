"use client";

import { useState } from "react";
import { setUserMax } from "@/app/actions";
import { toast } from "sonner";

interface MaxEntryFormProps {
  liftName: string;
  currentMax?: number | null;
  unit?: string;
  onDismiss?: () => void;
}

export function MaxEntryForm({ liftName, currentMax, unit = "kg", onDismiss }: MaxEntryFormProps) {
  const [editing, setEditing] = useState(false);
  const [weight, setWeight] = useState(currentMax?.toString() ?? "");
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  async function handleSubmit() {
    const val = parseFloat(weight);
    if (isNaN(val) || val <= 0) return;

    setLoading(true);
    try {
      await setUserMax(liftName, val);
      toast.success(`1RM for ${liftName} set to ${val}${unit}`);
      setEditing(false);
    } catch {
      toast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  }

  if (!currentMax && dismissed) {
    return null;
  }

  if (!currentMax && !editing) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setEditing(true)}
          className="squishy flex items-center gap-2 bg-primary-container px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-on-primary-fixed transition-colors"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          I KNOW MY 1RM
        </button>
        <button
          onClick={() => { setDismissed(true); onDismiss?.(); }}
          className="squishy flex items-center gap-2 bg-surface-variant px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-bright"
        >
          NOT SURE
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="0.5"
          min="0"
          placeholder="kg"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") {
              setEditing(false);
              setWeight(currentMax?.toString() ?? "");
            }
          }}
          className="w-20 border-0 border-b-2 border-outline-variant bg-transparent p-0 py-1 text-center font-headline text-lg font-bold text-on-surface placeholder:text-outline focus:border-primary focus:ring-0"
        />
        <span className="text-xs font-bold uppercase text-on-surface-variant">{unit}</span>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="squishy bg-primary-container px-3 py-1.5 text-[10px] font-bold text-on-primary-fixed disabled:opacity-50"
        >
          {loading ? "..." : "OK"}
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setWeight(currentMax?.toString() ?? "");
          }}
          className="text-outline hover:text-on-surface"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-headline text-2xl font-black text-primary-container">
        {currentMax}
      </span>
      <span className="text-sm font-bold uppercase text-on-surface-variant">{unit}</span>
      <button
        onClick={() => setEditing(true)}
        className="ml-1 flex h-7 w-7 items-center justify-center bg-surface-variant text-on-surface-variant transition-colors hover:bg-surface-bright hover:text-on-surface"
      >
        <span className="material-symbols-outlined text-sm">edit</span>
      </button>
    </div>
  );
}
