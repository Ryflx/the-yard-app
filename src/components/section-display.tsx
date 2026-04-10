import type { PercentageSet } from "@/db/schema";
import { calculateWeight, formatWeight } from "@/lib/percentage";

interface SectionDisplayProps {
  section: {
    type: string;
    sets: string | null;
    liftName: string | null;
    exercises: {
      name: string;
      percentageSets?: PercentageSet[];
    }[];
  };
  userMax?: { maxWeight: number; unit: string } | null;
}

export function SectionDisplay({ section, userMax }: SectionDisplayProps) {
  const isOlympic = section.type === "OLYMPIC LIFT";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span
          className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${
            isOlympic
              ? "bg-primary-container text-on-primary-fixed"
              : "bg-surface-container-highest text-on-surface-variant"
          }`}
        >
          {section.type}
        </span>
        {section.sets && (
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
            {section.sets}
          </span>
        )}
      </div>

      {section.liftName && (
        <p className="font-headline text-lg font-bold uppercase tracking-tight text-primary">
          {section.liftName}
        </p>
      )}

      <div className="flex flex-col gap-1">
        {section.exercises.map((exercise, i) => (
          <div key={i}>
            {exercise.percentageSets ? (
              <div className="flex flex-col gap-px">
                {exercise.percentageSets.map((ps, j) => (
                  <div
                    key={j}
                    className="flex items-center justify-between bg-surface-container p-3 transition-colors hover:bg-surface-container-high"
                  >
                    <span className="font-headline font-bold">
                      {ps.reps}
                      <span className="mx-1 text-on-surface-variant">@</span>
                      {ps.percentage}%
                    </span>
                    {userMax ? (
                      <span className="font-headline text-lg font-bold text-primary-container">
                        {formatWeight(
                          calculateWeight(userMax.maxWeight, ps.percentage),
                          userMax.unit
                        )}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
                        SET 1RM
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-4 py-2">
                <span className="font-bold text-on-surface">
                  {exercise.name}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
