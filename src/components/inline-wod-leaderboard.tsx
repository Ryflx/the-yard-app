"use client";

import { useState, useEffect } from "react";
import { getWodLeaderboard } from "@/app/actions";
import type { RxLevel } from "@/db/schema";
import { RxLevelTabs } from "./rx-level-tabs";
import Link from "next/link";

interface InlineWodLeaderboardProps {
  sectionId: number;
  defaultRxLevel: RxLevel;
  wodName?: string | null;
}

type LeaderboardEntry = {
  userId: string;
  displayName: string;
  scoreValue: string;
  rxLevel: RxLevel;
  position: number;
};

export function InlineWodLeaderboard({ sectionId, defaultRxLevel, wodName }: InlineWodLeaderboardProps) {
  const [rxLevel, setRxLevel] = useState<RxLevel>(defaultRxLevel);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getWodLeaderboard(sectionId, rxLevel).then((data) => {
      setEntries(data.entries);
      setCurrentUserId(data.currentUserId);
      setLoading(false);
    });
  }, [sectionId, rxLevel]);

  const userEntry = entries.find((e) => e.userId === currentUserId);
  const top5 = entries.slice(0, 5);
  const showUserSeparately = userEntry && userEntry.position > 5;

  return (
    <div className="bg-surface-container px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          LEADERBOARD
        </span>
      </div>

      <RxLevelTabs value={rxLevel} onChange={setRxLevel} />

      {loading ? (
        <div className="py-6 text-center text-xs text-outline">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Be the first!
          </p>
          <p className="mt-1 text-[10px] text-outline">
            No {rxLevel === "RX_PLUS" ? "RX+" : rxLevel} scores yet
          </p>
        </div>
      ) : (
        <div className="mt-3 flex flex-col">
          {top5.map((entry) => {
            const isMe = entry.userId === currentUserId;
            return (
              <div
                key={entry.userId}
                className={`flex items-center py-2 ${isMe ? "bg-primary/5 -mx-2 px-2" : ""}`}
              >
                <span className={`w-6 text-sm font-bold ${
                  entry.position === 1 ? "text-yellow-400" :
                  entry.position === 2 ? "text-gray-300" :
                  entry.position === 3 ? "text-amber-600" : "text-outline"
                }`}>
                  {entry.position}
                </span>
                <span className={`flex-1 text-sm font-bold uppercase tracking-tight ${isMe ? "text-primary" : "text-on-surface"}`}>
                  {isMe ? "You" : entry.displayName}
                </span>
                <span className={`text-sm font-bold tabular-nums ${isMe ? "text-primary" : "text-on-surface-variant"}`}>
                  {entry.scoreValue}
                </span>
              </div>
            );
          })}

          {showUserSeparately && (
            <>
              <div className="py-1 text-center text-xs text-outline">···</div>
              <div className="flex items-center bg-primary/5 -mx-2 px-2 py-2">
                <span className="w-6 text-sm font-bold text-outline">{userEntry.position}</span>
                <span className="flex-1 text-sm font-bold uppercase tracking-tight text-primary">You</span>
                <span className="text-sm font-bold tabular-nums text-primary">{userEntry.scoreValue}</span>
              </div>
            </>
          )}
        </div>
      )}

      {wodName && (
        <Link
          href={`/leaderboard/wod/${encodeURIComponent(wodName)}`}
          className="mt-3 block text-center text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
        >
          VIEW FULL LEADERBOARD →
        </Link>
      )}
    </div>
  );
}
