"use client";

import { useState } from "react";
import { PRCard } from "./pr-card";

interface SetMax {
  liftName: string;
  maxWeight: number;
  unit: string;
  updatedAt: Date;
}

interface UnsetGroup {
  label: string;
  lifts: string[];
}

interface PersonalRecordsSectionProps {
  setMaxes: SetMax[];
  unsetByGroup: UnsetGroup[];
}

/**
 * Two-section PR list:
 *   1. lifts the user has 1RMs for (sorted most-recent-first)
 *   2. catalog of lifts they don't, grouped by category, collapsed by default
 *
 * Replaces the previous "render all 51 catalog lifts as flat cards" layout
 * which buried the user's actual PRs in noise.
 */
export function PersonalRecordsSection({
  setMaxes,
  unsetByGroup,
}: PersonalRecordsSectionProps) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [showAddSection, setShowAddSection] = useState(false);

  function toggle(label: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  const totalUnset = unsetByGroup.reduce((acc, g) => acc + g.lifts.length, 0);
  const hasNoneAtAll = setMaxes.length === 0 && totalUnset === 0;

  if (hasNoneAtAll) {
    return (
      <section>
        <h3 className="mb-4 font-headline text-xl font-black uppercase tracking-tighter">
          PERSONAL RECORDS
        </h3>
        <div className="bg-surface-container-high p-12 text-center">
          <p className="font-headline text-xl font-bold uppercase tracking-tight text-on-surface-variant">
            NO LIFTS PROGRAMMED YET
          </p>
          <p className="mt-2 font-label text-xs tracking-widest text-outline">
            1RM CARDS APPEAR ONCE WORKOUTS ARE ADDED BY THE COACH
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="font-headline text-xl font-black uppercase tracking-tighter">
          PERSONAL RECORDS
        </h3>
        {setMaxes.length > 0 && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            {setMaxes.length} TRACKED
          </span>
        )}
      </div>

      {setMaxes.length > 0 ? (
        <div className="flex flex-col gap-px">
          {setMaxes.map((m) => (
            <PRCard
              key={m.liftName}
              liftName={m.liftName}
              maxWeight={m.maxWeight}
              unit={m.unit}
              updatedAt={m.updatedAt}
            />
          ))}
        </div>
      ) : (
        <div className="bg-surface-container-high p-8 text-center">
          <p className="font-headline text-sm font-bold uppercase tracking-tight text-on-surface-variant">
            NO 1RM RECORDS YET
          </p>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-outline">
            EXPAND A CATEGORY BELOW TO ADD ONE
          </p>
        </div>
      )}

      {totalUnset > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowAddSection((prev) => !prev)}
            className="flex w-full items-center justify-between border-b border-outline-variant/20 pb-2 transition-colors hover:text-on-surface"
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              ADD ANOTHER 1RM
            </span>
            <span className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
                {totalUnset} AVAILABLE
              </span>
              <span className="material-symbols-outlined text-sm text-outline">
                {showAddSection ? "expand_less" : "expand_more"}
              </span>
            </span>
          </button>

          {showAddSection && (
            <div className="mt-2 flex flex-col gap-1">
              {unsetByGroup.map((group) => {
                if (group.lifts.length === 0) return null;
                const isOpen = openGroups.has(group.label);
                return (
                  <div key={group.label}>
                    <button
                      onClick={() => toggle(group.label)}
                      className="flex w-full items-center justify-between bg-surface-container-low px-4 py-3 transition-colors hover:bg-surface-container"
                    >
                      <span className="font-headline text-xs font-bold uppercase tracking-tight">
                        {group.label}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
                          {group.lifts.length}
                        </span>
                        <span className="material-symbols-outlined text-sm text-outline">
                          {isOpen ? "expand_less" : "expand_more"}
                        </span>
                      </span>
                    </button>
                    {isOpen && (
                      <div className="flex flex-col gap-px py-px">
                        {group.lifts.map((lift) => (
                          <PRCard key={lift} liftName={lift} unit="kg" />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
