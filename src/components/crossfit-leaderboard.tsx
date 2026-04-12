"use client";

import { useState, useEffect } from "react";
import { getCrossfitLeaderboardData } from "@/app/actions";
import type { RxLevel } from "@/db/schema";
import { TIERS } from "@/lib/benchmark-wods";
import { RxLevelTabs } from "./rx-level-tabs";
import { TierLadder } from "./tier-ladder";
import Link from "next/link";

type Rankings = Awaited<ReturnType<typeof getCrossfitLeaderboardData>>["rankings"];
type CurrentUser = Awaited<ReturnType<typeof getCrossfitLeaderboardData>>["currentUser"];
type BenchmarkWod = Awaited<ReturnType<typeof getCrossfitLeaderboardData>>["benchmarkWods"][0];

const TIER_COLORS: Record<string, string> = {
  DRAGON: "#ff4444",
  BEAST: "#cafd00",
  WARRIOR: "#f3ffca",
  HUNTER: "#adaaaa",
  ROOKIE: "#777575",
};

export function CrossfitLeaderboard() {
  const [rxLevel, setRxLevel] = useState<RxLevel>("RX");
  const [rankings, setRankings] = useState<Rankings>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const [benchmarkWods, setBenchmarkWods] = useState<BenchmarkWod[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCrossfitLeaderboardData(rxLevel).then((data) => {
      setRankings(data.rankings);
      setCurrentUser(data.currentUser);
      setBenchmarkWods(data.benchmarkWods);
      setCurrentUserId(data.currentUserId);
      setLoading(false);
    });
  }, [rxLevel]);

  if (loading) {
    return <div className="py-12 text-center text-xs text-outline">Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <RxLevelTabs value={rxLevel} onChange={setRxLevel} />

      {currentUser && (
        <TierLadder
          compositeScore={currentUser.compositeScore}
          overallTier={currentUser.overallTier}
          pointsToNextTier={currentUser.pointsToNextTier}
          nextTier={currentUser.nextTier}
        />
      )}

      <section>
        <span className="mb-3 block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          TIER RANKINGS
        </span>

        {rankings.length === 0 ? (
          <div className="bg-surface-container p-8 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              NO RANKINGS YET
            </p>
            <p className="mt-1 text-[10px] text-outline">
              Need 3+ benchmark WODs to qualify
            </p>
          </div>
        ) : (
          <>
            {rankings.length >= 3 && (
              <div className="mb-4 flex items-end gap-2">
                {[rankings[1], rankings[0], rankings[2]].map((entry, idx) => {
                  if (!entry) return null;
                  const pos = idx === 0 ? 2 : idx === 1 ? 1 : 3;
                  const isMe = entry.userId === currentUserId;
                  return (
                    <div
                      key={entry.userId}
                      className={`flex flex-1 flex-col items-center bg-surface-container p-3 ${idx === 1 ? "" : "mt-4"}`}
                    >
                      <span className="text-lg">{pos === 1 ? "🥇" : pos === 2 ? "🥈" : "🥉"}</span>
                      <span className={`mt-1 text-xs font-bold uppercase tracking-tight ${isMe ? "text-primary" : ""}`}>
                        {isMe ? "You" : entry.displayName}
                      </span>
                      <div className="mt-2 flex flex-wrap justify-center gap-1">
                        {Object.entries(entry.tierCounts).map(([tier, count]) => (
                          <span
                            key={tier}
                            className="px-1.5 py-0.5 text-[8px] font-bold"
                            style={{ backgroundColor: TIER_COLORS[tier] + "30", color: TIER_COLORS[tier] }}
                          >
                            {count}
                          </span>
                        ))}
                      </div>
                      <span className={`mt-1 text-[10px] font-bold ${isMe ? "text-primary" : "text-outline"}`}>
                        {entry.compositeScore}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col gap-px">
              {rankings.map((entry, i) => {
                const isMe = entry.userId === currentUserId;
                return (
                  <div
                    key={entry.userId}
                    className={`flex items-center p-3 ${
                      isMe ? "bg-primary/5" : "bg-surface-container"
                    }`}
                  >
                    <span className={`w-7 text-sm font-bold ${
                      i === 0 ? "text-yellow-400" :
                      i === 1 ? "text-gray-300" :
                      i === 2 ? "text-amber-600" : "text-outline"
                    }`}>
                      {i + 1}
                    </span>
                    <span className={`flex-1 text-sm font-bold uppercase tracking-tight ${isMe ? "text-primary" : ""}`}>
                      {isMe ? "You" : entry.displayName}
                    </span>
                    <div className="mr-3 flex gap-1">
                      {Object.entries(entry.tierCounts).map(([tier, count]) =>
                        Array.from({ length: count }).map((_, j) => (
                          <span
                            key={`${tier}-${j}`}
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: TIER_COLORS[tier] }}
                          />
                        ))
                      )}
                    </div>
                    <span className={`text-sm font-bold ${isMe ? "text-primary" : "text-on-surface-variant"}`}>
                      {entry.compositeScore}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <section>
        <span className="mb-3 block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          BROWSE BENCHMARK WODS
        </span>
        <div className="grid grid-cols-2 gap-2">
          {benchmarkWods.map((wod) => (
            <Link
              key={wod.name}
              href={`/leaderboard/wod/${encodeURIComponent(wod.name)}`}
              className="bg-surface-container p-3 transition-colors hover:bg-surface-container-high"
            >
              <p className="text-sm font-bold uppercase tracking-tight">{wod.name}</p>
              <p className="mt-0.5 text-[10px] text-outline">{wod.description}</p>
              {wod.userBestTier ? (
                <span
                  className="mt-2 inline-block px-2 py-0.5 text-[9px] font-bold uppercase"
                  style={{ backgroundColor: TIER_COLORS[wod.userBestTier] + "30", color: TIER_COLORS[wod.userBestTier] }}
                >
                  {wod.userBestTier}
                </span>
              ) : (
                <span className="mt-2 inline-block text-[9px] text-outline">Not attempted</span>
              )}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
