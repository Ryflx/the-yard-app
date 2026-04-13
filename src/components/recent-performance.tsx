"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";

interface LiftLog {
  id: number;
  date: string;
  liftName: string;
  weight: number;
  reps: number | null;
  sets: number | null;
  unit: string;
}

export function RecentPerformance({ history }: { history: LiftLog[] }) {
  const [expanded, setExpanded] = useState(false);
  const PREVIEW_COUNT = 3;
  const visible = expanded ? history : history.slice(0, PREVIEW_COUNT);
  const hasMore = history.length > PREVIEW_COUNT;

  if (history.length === 0) {
    return (
      <section>
        <h3 className="mb-6 font-headline text-2xl font-black uppercase tracking-tighter">
          RECENT PERFORMANCE
        </h3>
        <div className="bg-surface-container-high p-12 text-center">
          <p className="font-headline text-xl font-bold uppercase tracking-tight text-on-surface-variant">
            NO LIFTS LOGGED YET
          </p>
          <p className="mt-2 font-label text-xs tracking-widest text-outline">
            LOG YOUR FIRST SET FROM A WORKOUT
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-6 flex items-baseline justify-between">
        <h3 className="font-headline text-2xl font-black uppercase tracking-tighter">
          RECENT PERFORMANCE
        </h3>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-primary hover:underline"
          >
            {expanded ? "SHOW LESS" : `ALL HISTORY (${history.length})`}
          </button>
        )}
      </div>

      <div className="space-y-px">
        {visible.map((log) => (
          <div
            key={log.id}
            className="flex items-center justify-between bg-surface-container p-4 transition-colors hover:bg-surface-container-high"
          >
            <div className="flex items-center gap-6">
              <div className="flex h-12 w-12 flex-col items-center justify-center bg-surface-variant">
                <span className="text-[10px] font-black leading-none">
                  {format(parseISO(log.date), "MMM").toUpperCase()}
                </span>
                <span className="text-lg font-black leading-none">
                  {format(parseISO(log.date), "d")}
                </span>
              </div>
              <div>
                <p className="font-headline text-sm font-bold uppercase tracking-tight">
                  {log.liftName}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-widest text-on-surface-variant">
                  {log.reps && `${log.reps} reps`}
                  {log.sets && ` · ${log.sets} sets`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-headline text-xl font-bold text-on-surface">
                {log.weight} {log.unit}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
