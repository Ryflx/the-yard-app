import { TIERS } from "@/lib/benchmark-wods";

interface TierLadderProps {
  compositeScore: number;
  overallTier: string;
  pointsToNextTier: number;
  nextTier: string | null;
}

const TIER_THRESHOLDS = [
  { name: "DRAGON", min: 850, label: "Top 2%" },
  { name: "BEAST", min: 600, label: "Top 16%" },
  { name: "WARRIOR", min: 350, label: "Top 50%" },
  { name: "HUNTER", min: 150, label: "Top 84%" },
  { name: "ROOKIE", min: 0, label: "Getting started" },
];

export function TierLadder({ compositeScore, overallTier, pointsToNextTier, nextTier }: TierLadderProps) {
  const currentTierIdx = TIER_THRESHOLDS.findIndex((t) => t.name === overallTier);
  const currentTierColor = TIERS[currentTierIdx]?.color ?? "#777";

  return (
    <div className="bg-surface-container px-5 py-4">
      <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
        YOUR TIER
      </span>

      <div className="relative mt-4 flex flex-col gap-0 pl-10">
        {/* Vertical line */}
        <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gradient-to-b from-[#ff4444] via-[#cafd00] to-[#777575]" />

        {TIER_THRESHOLDS.map((tier, idx) => {
          const tierData = TIERS[idx];
          const isCurrentTier = tier.name === overallTier;

          return (
            <div key={tier.name} className="relative flex items-center gap-3 py-2.5">
              {/* Dot */}
              <div
                className="absolute left-[-26px] z-10 h-3 w-3 rounded-full border-2 border-surface"
                style={{ backgroundColor: tierData.color }}
              />

              {isCurrentTier ? (
                <>
                  {/* YOU marker */}
                  <div
                    className="absolute left-[-30px] z-20 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface"
                    style={{ backgroundColor: "#22c55e" }}
                  >
                    <span className="text-[6px] font-black text-black">YOU</span>
                  </div>
                  <div className="flex-1 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-headline text-lg font-black text-primary">
                        {compositeScore} pts
                      </span>
                      <span
                        className="text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: tierData.color }}
                      >
                        {tier.name}
                      </span>
                    </div>
                    {nextTier && pointsToNextTier > 0 && (
                      <p className="mt-1 text-[10px] text-primary/70">
                        {pointsToNextTier} pts to {nextTier}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-between">
                  <span
                    className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: tierData.color }}
                  >
                    {tierData.icon === "local_fire_department" ? "🐉" :
                     tierData.icon === "pets" ? "🦁" :
                     tierData.icon === "shield" ? "⚔️" :
                     tierData.icon === "target" ? "🏹" : ""}{" "}
                    {tier.name}
                  </span>
                  <span className="text-[10px] text-outline">{tier.min}+ pts</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
