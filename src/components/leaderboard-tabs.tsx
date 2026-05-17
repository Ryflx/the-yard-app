"use client";

import { useMemo, useState } from "react";
import { CrossfitLeaderboard } from "./crossfit-leaderboard";
import { LIFT_CATALOG } from "@/lib/lift-catalog";

interface BarbellData {
  lifts: string[];
  entries: Record<string, { userId: string; displayName: string; weight: number; unit: string }[]>;
  currentUserId: string | null;
}

export function LeaderboardTabs({ barbellData }: { barbellData: BarbellData }) {
  const [tab, setTab] = useState<"BARBELL" | "CROSSFIT">("BARBELL");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex border-b border-surface-container-highest">
        {(["BARBELL", "CROSSFIT"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-center text-[11px] font-bold uppercase tracking-widest transition-colors ${
              tab === t
                ? "border-b-2 border-primary text-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "BARBELL" ? (
        <BarbellLeaderboard data={barbellData} />
      ) : (
        <CrossfitLeaderboard />
      )}
    </div>
  );
}

const CATEGORY_LABELS = ["ALL", ...LIFT_CATALOG.map((g) => g.label.toUpperCase())] as const;
type Category = (typeof CATEGORY_LABELS)[number];

function categoryFor(lift: string): string | null {
  const lower = lift.toLowerCase();
  for (const g of LIFT_CATALOG) {
    if (g.lifts.some((l) => l.toLowerCase() === lower)) return g.label.toUpperCase();
  }
  return null;
}

function BarbellLeaderboard({ data }: { data: BarbellData }) {
  const { lifts, entries, currentUserId } = data;
  const [category, setCategory] = useState<Category>("ALL");
  const [query, setQuery] = useState("");

  const filteredLifts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lifts.filter((lift) => {
      if (category !== "ALL" && categoryFor(lift) !== category) return false;
      if (q && !lift.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [lifts, category, query]);

  if (lifts.length === 0) {
    return (
      <div className="bg-surface-container-high p-12 text-center">
        <span
          className="material-symbols-outlined mb-4 text-5xl text-outline"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          emoji_events
        </span>
        <p className="font-headline text-xl font-bold uppercase tracking-tight text-on-surface-variant">
          NO ONE ON THE BOARD YET
        </p>
        <p className="mt-2 font-label text-xs tracking-widest text-outline">
          OPT IN FROM YOUR PROFILE TO APPEAR HERE
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="-mx-6 overflow-x-auto px-6 md:-mx-8 md:px-8">
          <div className="flex gap-2">
            {CATEGORY_LABELS.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`squishy shrink-0 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  category === c
                    ? "bg-primary-container text-on-primary-fixed"
                    : "bg-surface-variant text-on-surface-variant hover:bg-surface-bright hover:text-on-surface"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-outline">
            search
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SEARCH LIFT"
            className="w-full bg-surface-container py-2.5 pl-10 pr-10 font-label text-[11px] font-bold uppercase tracking-widest text-on-surface outline-none placeholder:text-outline focus:bg-surface-container-high"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
        </div>
      </div>

      {filteredLifts.length === 0 ? (
        <div className="bg-surface-container-high p-8 text-center">
          <p className="font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
            NO LIFTS MATCH
          </p>
          <p className="mt-1 text-[10px] text-outline">
            {query ? `No results for "${query}"` : `No ${category.toLowerCase()} lifts yet`}
          </p>
        </div>
      ) : (
      <div className="flex flex-col gap-6">
      {filteredLifts.map((lift) => (
        <section key={lift}>
          <h3 className="mb-3 font-headline text-lg font-bold uppercase tracking-tight">
            {lift}
          </h3>
          <div className="flex flex-col gap-px">
            {entries[lift].map((entry, i) => {
              const isMe = entry.userId === currentUserId;
              return (
                <div
                  key={entry.userId}
                  className={`flex items-center justify-between p-4 transition-colors ${
                    isMe
                      ? "bg-primary-container/20"
                      : "bg-surface-container hover:bg-surface-container-high"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`flex h-8 w-8 items-center justify-center font-headline text-sm font-black ${
                        i === 0
                          ? "bg-primary-container text-on-primary-fixed"
                          : i === 1
                            ? "bg-surface-container-highest text-on-surface"
                            : i === 2
                              ? "bg-surface-variant text-on-surface-variant"
                              : "text-outline"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className={`font-headline font-bold uppercase tracking-tight ${isMe ? "text-primary" : ""}`}>
                      {entry.displayName}
                      {isMe && (
                        <span className="ml-2 text-[9px] font-bold tracking-widest text-primary">
                          YOU
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="font-headline text-xl font-bold">
                    {entry.weight}
                    <span className="ml-1 text-sm text-on-surface-variant">{entry.unit}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      </div>
      )}
    </div>
  );
}
