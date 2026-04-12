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
      <div className="relative overflow-hidden bg-surface-container p-6">
        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
          {liftName}
        </span>
        <div className="mt-4 flex items-end gap-3">
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
                if (e.key === "Escape") setEditing(false);
              }}
              className="mt-1 w-full border-0 border-b-2 border-outline-variant bg-surface-container-lowest p-0 py-2 font-headline text-4xl font-black transition-colors placeholder:text-outline focus:border-primary focus:ring-0"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className="squishy flex-1 bg-primary-container py-3 font-headline text-xs font-black uppercase tracking-widest text-on-primary-fixed disabled:opacity-50"
          >
            {loading ? "SAVING..." : "SAVE"}
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setWeight(maxWeight?.toString() ?? "");
            }}
            className="squishy bg-surface-variant px-4 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-surface transition-colors hover:bg-surface-bright"
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
        className="group relative flex flex-col items-center justify-center overflow-hidden bg-surface-container-low p-6 transition-colors hover:bg-surface-container-high"
      >
        <span className="material-symbols-outlined mb-2 text-3xl text-outline transition-colors group-hover:text-primary-container">
          add_circle
        </span>
        <span className="font-headline text-sm font-bold uppercase tracking-tight text-on-surface-variant">
          {liftName}
        </span>
        <span className="mt-1 font-label text-[10px] tracking-widest text-outline">
          TAP TO SET 1RM
        </span>
      </button>
    );
  }

  return (
    <div className="group relative overflow-hidden bg-surface-container p-6">
      <span className="absolute right-4 top-4 text-[10px] font-bold uppercase tracking-widest text-primary">
        {liftName}
      </span>
      <p className="mt-4 font-headline text-6xl font-black transition-transform group-hover:origin-left group-hover:scale-105">
        {maxWeight}
      </p>
      <p className="-mt-1 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
        {unit}
      </p>
      <div className="mt-6 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
          {updatedAt ? format(updatedAt, "d MMM yyyy") : "—"}
        </span>
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary opacity-0 transition-opacity group-hover:opacity-100"
        >
          <span className="material-symbols-outlined text-sm">edit</span>
          UPDATE
        </button>
      </div>
    </div>
  );
}
