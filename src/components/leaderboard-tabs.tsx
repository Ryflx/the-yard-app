"use client";

import { useState } from "react";
import { CrossfitLeaderboard } from "./crossfit-leaderboard";

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

function BarbellLeaderboard({ data }: { data: BarbellData }) {
  const { lifts, entries, currentUserId } = data;

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
      {lifts.map((lift) => (
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
  );
}
