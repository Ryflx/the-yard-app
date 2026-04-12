"use client";

import { useState } from "react";
import { setUserMax } from "@/app/actions";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

interface EstimatedOneRMBannerProps {
  liftName: string;
  estimatedMax: number;
  basedOn: { weight: number; reps: number; date: string };
  variant: "no-max" | "stale";
  currentMax?: number;
  currentMaxDate?: Date;
  unit?: string;
}

export function EstimatedOneRMBanner({
  liftName,
  estimatedMax,
  basedOn,
  variant,
  currentMax,
  currentMaxDate,
  unit = "kg",
}: EstimatedOneRMBannerProps) {
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  async function handleAccept() {
    setLoading(true);
    try {
      await setUserMax(liftName, estimatedMax);
      toast.success(`1RM for ${liftName} updated to ${estimatedMax}${unit}`);
      setAccepted(true);
    } catch {
      toast.error("Failed to update");
    } finally {
      setLoading(false);
    }
  }

  if (accepted) {
    return (
      <div className="flex items-center gap-3 bg-primary/10 px-5 py-3">
        <span className="material-symbols-outlined text-base text-primary">check_circle</span>
        <span className="font-label text-[10px] font-bold uppercase tracking-widest text-primary">
          1RM UPDATED TO {estimatedMax}{unit}
        </span>
      </div>
    );
  }

  const basisLabel = `${basedOn.reps}×${basedOn.weight}${unit} on ${format(parseISO(basedOn.date), "MMM d")}`;

  if (variant === "no-max") {
    return (
      <div className="flex flex-col gap-2 bg-primary/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-primary">smart_toy</span>
          <span className="font-label text-[10px] font-bold uppercase tracking-widest text-primary">
            ESTIMATED 1RM — {liftName.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-2xl font-black text-primary">
              {estimatedMax}
            </span>
            <span className="text-sm font-bold uppercase text-primary/70">{unit}</span>
            <span className="ml-1 font-label text-[9px] tracking-wide text-on-surface-variant">
              based on {basisLabel}
            </span>
          </div>
          <button
            onClick={handleAccept}
            disabled={loading}
            className="squishy bg-primary px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-on-primary disabled:opacity-50"
          >
            {loading ? "..." : "USE THIS"}
          </button>
        </div>
      </div>
    );
  }

  const weeksAgo = currentMaxDate
    ? Math.floor((Date.now() - currentMaxDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
    : null;
  const timeLabel = weeksAgo ? `set ${weeksAgo}w ago` : "";

  return (
    <div className="flex flex-col gap-2 bg-primary/10 px-5 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-primary">trending_up</span>
          <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            YOUR 1RM — {currentMax}{unit}
            {timeLabel && (
              <span className="ml-1 text-outline">({timeLabel})</span>
            )}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="font-label text-[10px] tracking-wide text-primary">
            Recent lifts suggest
          </span>
          <span className="font-headline text-lg font-black text-primary">
            {estimatedMax}{unit}
          </span>
          <span className="font-label text-[9px] tracking-wide text-on-surface-variant">
            ({basisLabel})
          </span>
        </div>
        <button
          onClick={handleAccept}
          disabled={loading}
          className="squishy bg-primary px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-on-primary disabled:opacity-50"
        >
          {loading ? "..." : "UPDATE"}
        </button>
      </div>
    </div>
  );
}
