"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";

interface HistoryEntry {
  id: number;
  weight: number;
  reps: number | null;
  repsText?: string | null;
  unit: string;
  date: string;
}

interface ExerciseHistorySectionProps {
  history: Record<string, HistoryEntry[]>;
}

const COLLAPSED_COUNT = 3;

function ExerciseGroup({ name, logs }: { name: string; logs: HistoryEntry[] }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = logs.length > COLLAPSED_COUNT;
  const visible = expanded ? logs : logs.slice(0, COLLAPSED_COUNT);

  return (
    <div>
      <p className="mb-2 font-label text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
        {name}
      </p>
      <div className="flex flex-col gap-px">
        {visible.map((log, i) => (
          <div
            key={log.id}
            className="flex items-center justify-between bg-surface-container px-4 py-3 transition-colors hover:bg-surface-container-high"
          >
            <div className="flex items-center gap-4">
              <span className="w-6 text-right font-headline text-sm font-black text-outline">
                {String(visible.length - i).padStart(2, "0")}
              </span>
              <div className="flex flex-col">
                <span className="font-headline font-bold">
                  {log.weight} {log.unit}
                  {(log.repsText ?? log.reps) != null && (
                    <>
                      <span className="mx-1 text-on-surface-variant">x</span>
                      <span>{log.repsText ?? log.reps}</span>
                    </>
                  )}
                </span>
                <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                  {format(parseISO(log.date), "d MMM yyyy")}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 flex w-full items-center justify-center gap-1 py-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant transition-colors hover:text-primary"
        >
          <span className="material-symbols-outlined text-sm">
            {expanded ? "expand_less" : "expand_more"}
          </span>
          {expanded
            ? "SHOW LESS"
            : `SHOW ${logs.length - COLLAPSED_COUNT} MORE`}
        </button>
      )}
    </div>
  );
}

export function ExerciseHistorySection({ history }: ExerciseHistorySectionProps) {
  const entries = Object.entries(history);
  if (entries.length === 0) return null;

  return (
    <section>
      <div className="mb-4 border-b border-outline-variant/20 pb-2">
        <h3 className="font-headline text-sm font-bold uppercase tracking-widest">
          YOUR HISTORY
        </h3>
      </div>
      <div className="flex flex-col gap-6">
        {entries.map(([name, logs]) => (
          <ExerciseGroup key={name} name={name} logs={logs} />
        ))}
      </div>
    </section>
  );
}
