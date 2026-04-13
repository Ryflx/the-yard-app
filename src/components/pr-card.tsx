"use client";

import { useState } from "react";
import { setUserMax } from "@/app/actions";
import { toast } from "sonner";
import { format } from "date-fns";

interface PRCardProps {
  liftName: string;
  maxWeight?: number | null;
  unit?: string;
  updatedAt?: Date | null;
}

export function PRCard({ liftName, maxWeight, unit = "kg", updatedAt }: PRCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [weight, setWeight] = useState(maxWeight?.toString() ?? "");
  const [loading, setLoading] = useState(false);
  const hasMax = maxWeight != null && maxWeight > 0;

  async function handleSave() {
    const val = parseFloat(weight);
    if (isNaN(val) || val <= 0) return;

    setLoading(true);
    try {
      await setUserMax(liftName, val);
      toast.success(`1RM for ${liftName} updated to ${val}kg`);
      setEditing(false);
    } catch {
      toast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  }

  if (editing) {
    return (
      <div className="relative overflow-hidden bg-surface-container p-5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
          {liftName}
        </span>
        <div className="mt-3 flex items-end gap-3">
          <div className="flex-1">
            <label className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              1RM ({unit.toUpperCase()})
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              autoFocus
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") { setEditing(false); setExpanded(true); }
              }}
              className="mt-1 w-full border-0 border-b-2 border-outline-variant bg-surface-container-lowest p-0 py-2 font-headline text-3xl font-black transition-colors placeholder:text-outline focus:border-primary focus:ring-0"
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className="squishy flex-1 bg-primary-container py-2.5 font-headline text-xs font-black uppercase tracking-widest text-on-primary-fixed disabled:opacity-50"
          >
            {loading ? "SAVING..." : "SAVE"}
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setExpanded(true);
              setWeight(maxWeight?.toString() ?? "");
            }}
            className="squishy bg-surface-variant px-4 py-2.5 font-headline text-xs font-bold uppercase tracking-widest text-on-surface transition-colors hover:bg-surface-bright"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      </div>
    );
  }

  if (!hasMax) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center justify-between bg-surface-container-low px-4 py-3 transition-colors hover:bg-surface-container-high"
      >
        <span className="font-headline text-xs font-bold uppercase tracking-tight text-on-surface-variant">
          {liftName}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">SET 1RM</span>
      </button>
    );
  }

  // Compact chip (collapsed)
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="squishy flex items-center justify-between bg-surface-container px-4 py-3 transition-colors hover:bg-surface-container-high"
      >
        <span className="font-headline text-xs font-bold uppercase tracking-tight">
          {liftName}
        </span>
        <span className="font-headline text-lg font-black text-primary-container">
          {maxWeight}<span className="ml-0.5 text-[10px] font-bold text-on-surface-variant">{unit}</span>
        </span>
      </button>
    );
  }

  // Expanded card
  return (
    <div className="overflow-hidden bg-surface-container">
      <button
        onClick={() => setExpanded(false)}
        className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-surface-container-high"
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
          {liftName}
        </span>
        <span className="material-symbols-outlined text-sm text-outline">expand_less</span>
      </button>
      <div className="px-4 pb-4">
        <p className="font-headline text-5xl font-black">
          {maxWeight}
          <span className="ml-1 text-sm font-bold uppercase tracking-widest text-on-surface-variant">{unit}</span>
        </p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
            {updatedAt ? `UPDATED ${format(updatedAt, "d MMM yyyy")}` : "—"}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
            UPDATE
          </button>
        </div>
      </div>
    </div>
  );
}
