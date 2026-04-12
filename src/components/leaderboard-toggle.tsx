"use client";

import { useState } from "react";
import { updateLeaderboardOptIn } from "@/app/actions";
import { toast } from "sonner";

interface LeaderboardToggleProps {
  initialOptIn: boolean;
}

export function LeaderboardToggle({ initialOptIn }: LeaderboardToggleProps) {
  const [optIn, setOptIn] = useState(initialOptIn);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      const newVal = !optIn;
      await updateLeaderboardOptIn(newVal);
      setOptIn(newVal);
      toast.success(newVal ? "You're on the leaderboard" : "Removed from leaderboard");
    } catch {
      toast.error("Failed to update");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface-container p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-headline text-sm font-bold uppercase tracking-tight">
            LEADERBOARD
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            {optIn ? "YOUR LIFTS ARE VISIBLE" : "OPT IN TO SHOW YOUR LIFTS"}
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`squishy px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50 ${
            optIn
              ? "bg-primary-container text-on-primary-fixed"
              : "bg-surface-variant text-on-surface-variant hover:bg-surface-bright"
          }`}
        >
          <span className="material-symbols-outlined mr-1 align-middle text-sm">
            {optIn ? "visibility" : "visibility_off"}
          </span>
          {loading ? "..." : optIn ? "VISIBLE" : "HIDDEN"}
        </button>
      </div>
    </div>
  );
}
