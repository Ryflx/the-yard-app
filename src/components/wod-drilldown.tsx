"use client";

import { useState, useEffect } from "react";
import { getWodDrilldown } from "@/app/actions";
import type { RxLevel } from "@/db/schema";
import { TIERS } from "@/lib/benchmark-wods";
import { RxLevelTabs } from "./rx-level-tabs";

type DrilldownData = NonNullable<Awaited<ReturnType<typeof getWodDrilldown>>>;

const TIER_COLORS: Record<string, string> = {
  DRAGON: "#ff4444",
  BEAST: "#cafd00",
  WARRIOR: "#f3ffca",
  HUNTER: "#adaaaa",
  ROOKIE: "#777575",
};

export function WodDrilldownClient({
  wodName,
  initialData,
}: {
  wodName: string;
  initialData: DrilldownData;
}) {
  const [rxLevel, setRxLevel] = useState<RxLevel>("RX");
  const [data, setData] = useState<DrilldownData>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (rxLevel === "RX") return;
    setLoading(true);
    getWodDrilldown(wodName, rxLevel).then((result) => {
      if (result) setData(result);
      setLoading(false);
    });
  }, [rxLevel, wodName]);

  const { userBest, entries, currentUserId } = data;

  return (
    <div className="flex flex-col gap-6">
      {userBest && (
        <div className="border border-primary/30 bg-surface-container px-5 py-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                YOUR BEST
              </span>
              <p className="mt-1 font-headline text-3xl font-black text-on-surface">
                {userBest.scoreValue}
              </p>
              <p className="mt-1 text-[10px] text-outline">
                {userBest.date} · {userBest.rxLevel === "RX_PLUS" ? "RX+" : userBest.rxLevel}
              </p>
            </div>
            {userBest.tier && (
              <div className="text-right">
                <span
                  className="inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-widest"
                  style={{ backgroundColor: TIER_COLORS[userBest.tier] + "30", color: TIER_COLORS[userBest.tier] }}
                >
                  {userBest.tier}
                </span>
                {userBest.percentile && (
                  <p className="mt-1 text-[10px] text-outline">{userBest.percentile}</p>
                )}
              </div>
            )}
          </div>
          {userBest.distanceToNextTier && userBest.nextTier && (
            <p className="mt-3 border-t border-surface-container-highest pt-3 text-center text-[10px] font-bold text-primary">
              {userBest.distanceToNextTier} to reach {userBest.nextTier}
            </p>
          )}
        </div>
      )}

      <RxLevelTabs value={rxLevel} onChange={setRxLevel} />

      <section>
        <span className="mb-3 block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          ALL SCORES
        </span>

        {loading ? (
          <div className="py-8 text-center text-xs text-outline">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="bg-surface-container p-8 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              NO SCORES YET
            </p>
            <p className="mt-1 text-[10px] text-outline">
              Be the first to log {rxLevel === "RX_PLUS" ? "RX+" : rxLevel}!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-px">
            {entries.map((entry) => {
              const isMe = entry.userId === currentUserId;
              return (
                <div
                  key={entry.userId}
                  className={`flex items-center p-3 ${
                    isMe ? "bg-primary/5" : "bg-surface-container"
                  }`}
                >
                  <span className={`w-7 text-sm font-bold ${
                    entry.position === 1 ? "text-yellow-400" :
                    entry.position === 2 ? "text-gray-300" :
                    entry.position === 3 ? "text-amber-600" : "text-outline"
                  }`}>
                    {entry.position}
                  </span>
                  <span className={`flex-1 text-sm font-bold uppercase tracking-tight ${isMe ? "text-primary" : ""}`}>
                    {isMe ? "You" : entry.displayName}
                  </span>
                  {entry.tier && (
                    <span
                      className="mr-3 px-1.5 py-0.5 text-[8px] font-bold uppercase"
                      style={{ backgroundColor: TIER_COLORS[entry.tier] + "30", color: TIER_COLORS[entry.tier] }}
                    >
                      {entry.tier}
                    </span>
                  )}
                  <span className={`text-sm font-bold tabular-nums ${isMe ? "text-primary" : "text-on-surface-variant"}`}>
                    {entry.scoreValue}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
