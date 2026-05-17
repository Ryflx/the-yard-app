"use client";

interface Props {
  planId: number;
  sessionCount: number;
  unplaceableCount: number;
  onGoToSchedule: () => void;
  onViewPlan: () => void;
}

export function SuccessStep({
  sessionCount,
  unplaceableCount,
  onGoToSchedule,
  onViewPlan,
}: Props) {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center bg-primary-container">
        <span
          className="material-symbols-outlined text-4xl text-on-primary-fixed"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          check
        </span>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary-container">
          ALL SET
        </p>
        <h2 className="mt-2 font-headline text-3xl font-black uppercase tracking-tight">
          YOUR PLAN IS READY
        </h2>
        <p className="mt-3 text-sm text-on-surface-variant">
          We scheduled {sessionCount} skill session{sessionCount === 1 ? "" : "s"} across the next 8 weeks.
          They&apos;ll show up on your schedule on the days you picked.
        </p>
      </div>

      {unplaceableCount > 0 && (
        <div className="border-l-2 border-yellow-500 bg-yellow-500/10 px-3 py-2 text-left text-xs text-yellow-200">
          Heads up — {unplaceableCount} drill{unplaceableCount === 1 ? "" : "s"} couldn&apos;t fit your slots.
          Add more days or longer slots and regenerate if you want every drill placed.
        </div>
      )}

      <div className="space-y-2">
        <button
          onClick={onGoToSchedule}
          type="button"
          className="w-full bg-primary-container py-3.5 font-headline text-sm font-black uppercase tracking-widest text-on-primary-fixed"
        >
          GO TO SCHEDULE
        </button>
        <button
          onClick={onViewPlan}
          type="button"
          className="w-full bg-surface-container py-3 font-headline text-xs font-black uppercase tracking-widest text-on-surface"
        >
          VIEW FULL PLAN
        </button>
      </div>
    </div>
  );
}
