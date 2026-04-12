"use client";

import type { StrengthAssessment, GeneralStrengthAssessment } from "@/lib/strength-standards";

interface StrengthDashboardProps {
  assessments: StrengthAssessment[];
  generalAssessments?: GeneralStrengthAssessment[];
}

const LEVEL_COLORS: Record<number, string> = {
  1: "#494847",
  2: "#5c5a58",
  3: "#777575",
  4: "#adaaaa",
  5: "#cafd00",
  6: "#f3ffca",
  7: "#ffffff",
};

const GENERAL_LEVEL_COLORS: Record<number, string> = {
  1: "#5c5a58",
  2: "#777575",
  3: "#adaaaa",
  4: "#cafd00",
  5: "#ffffff",
};

function LiftGauge({ assessment }: { assessment: StrengthAssessment }) {
  return (
    <div className="bg-surface-container p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="font-headline text-lg font-bold uppercase tracking-tight">
            {assessment.standardLift}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            {assessment.userWeight} KG
          </p>
        </div>
        <div className="text-right">
          <p
            className="font-headline text-3xl font-black"
            style={{ color: LEVEL_COLORS[assessment.level] }}
          >
            L{assessment.level}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
            {assessment.levelLabel}
          </p>
        </div>
      </div>

      <div className="mb-3 flex gap-[2px]">
        {assessment.thresholds.map((t) => {
          const isReached = assessment.level >= t.level;
          const isCurrent = assessment.level === t.level;
          return (
            <div
              key={t.level}
              className="relative flex-1 overflow-hidden"
              style={{ height: isCurrent ? 12 : 8 }}
            >
              <div
                className="h-full w-full transition-all duration-500"
                style={{
                  backgroundColor: isReached
                    ? LEVEL_COLORS[t.level]
                    : "#1a1a1a",
                  opacity: isCurrent ? 1 : isReached ? 0.6 : 0.2,
                }}
              />
              {isCurrent && (
                <div
                  className="absolute inset-y-0 left-0 bg-primary-container"
                  style={{ width: `${assessment.progressInLevel * 100}%` }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="mb-4 flex justify-between">
        {assessment.thresholds.map((t) => (
          <span
            key={t.level}
            className={`text-[8px] font-bold tracking-wider ${
              assessment.level >= t.level
                ? "text-on-surface"
                : "text-outline"
            }`}
          >
            {t.level}
          </span>
        ))}
      </div>

      {assessment.nextLevelTarget && (
        <div className="flex items-center justify-between border-t border-outline-variant/20 pt-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
            NEXT: LEVEL {assessment.level + 1}
          </span>
          <span className="font-headline text-sm font-bold text-primary">
            {assessment.nextLevelTarget} KG
            <span className="ml-1 text-[10px] text-on-surface-variant">
              (+{assessment.nextLevelTarget - assessment.userWeight})
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

function GeneralLiftGauge({ assessment }: { assessment: GeneralStrengthAssessment }) {
  return (
    <div className="bg-surface-container p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="font-headline text-lg font-bold uppercase tracking-tight">
            {assessment.liftName}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            {assessment.userWeight} KG
          </p>
        </div>
        <div className="text-right">
          <p
            className="font-headline text-3xl font-black"
            style={{ color: GENERAL_LEVEL_COLORS[assessment.level] }}
          >
            L{assessment.level}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
            {assessment.levelLabel}
          </p>
        </div>
      </div>

      <div className="mb-3 flex gap-[2px]">
        {assessment.thresholds.map((t) => {
          const isReached = assessment.level >= t.level;
          const isCurrent = assessment.level === t.level;
          return (
            <div
              key={t.level}
              className="relative flex-1 overflow-hidden"
              style={{ height: isCurrent ? 12 : 8 }}
            >
              <div
                className="h-full w-full transition-all duration-500"
                style={{
                  backgroundColor: isReached
                    ? GENERAL_LEVEL_COLORS[t.level]
                    : "#1a1a1a",
                  opacity: isCurrent ? 1 : isReached ? 0.6 : 0.2,
                }}
              />
              {isCurrent && (
                <div
                  className="absolute inset-y-0 left-0 bg-primary-container"
                  style={{ width: `${assessment.progressInLevel * 100}%` }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="mb-4 flex justify-between">
        {assessment.thresholds.map((t) => (
          <span
            key={t.level}
            className={`text-[8px] font-bold tracking-wider ${
              assessment.level >= t.level
                ? "text-on-surface"
                : "text-outline"
            }`}
          >
            {t.label}
          </span>
        ))}
      </div>

      {assessment.nextLevelTarget && (
        <div className="flex items-center justify-between border-t border-outline-variant/20 pt-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
            NEXT: {assessment.thresholds.find(t => t.level === assessment.level + 1)?.label ?? `L${assessment.level + 1}`}
          </span>
          <span className="font-headline text-sm font-bold text-primary">
            {assessment.nextLevelTarget} KG
            <span className="ml-1 text-[10px] text-on-surface-variant">
              (+{Math.round((assessment.nextLevelTarget - assessment.userWeight) * 2) / 2})
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

export function StrengthDashboard({ assessments, generalAssessments = [] }: StrengthDashboardProps) {
  if (assessments.length === 0 && generalAssessments.length === 0) return null;

  const allCount = assessments.length + generalAssessments.length;

  const olyAvg = assessments.length > 0
    ? assessments.reduce((sum, a) => sum + a.level + a.progressInLevel, 0) / assessments.length
    : 0;
  const genAvg = generalAssessments.length > 0
    ? generalAssessments.reduce((sum, a) => sum + a.level + a.progressInLevel, 0) / generalAssessments.length
    : 0;

  const olyNorm = assessments.length > 0 ? olyAvg / 7 : 0;
  const genNorm = generalAssessments.length > 0 ? genAvg / 5 : 0;
  const totalWeighted = assessments.length > 0 && generalAssessments.length > 0
    ? (olyNorm * assessments.length + genNorm * generalAssessments.length) / allCount
    : assessments.length > 0 ? olyNorm : genNorm;
  const overallScore = Math.round(totalWeighted * 1000);

  return (
    <section className="flex flex-col gap-6">
      <div className="bg-surface-container-high p-8">
        <div className="mb-4 flex items-end justify-between">
          <h3 className="font-headline text-4xl font-black uppercase italic tracking-tighter">
            STRENGTH SCORE
          </h3>
          <span className="font-headline text-5xl font-black text-primary">
            {overallScore}
          </span>
        </div>
        <div className="relative h-12 overflow-hidden bg-surface-container-lowest">
          <div
            className="h-full bg-primary transition-all duration-700"
            style={{ width: `${(overallScore / 1000) * 100}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-between px-4 text-[10px] font-black uppercase tracking-widest mix-blend-difference">
            <span>
              {allCount} lift{allCount !== 1 ? "s" : ""} tracked
            </span>
            <span>
              {overallScore} / 1000
            </span>
          </div>
        </div>
        <p className="mt-3 font-label text-[10px] tracking-widest text-outline">
          {assessments.length > 0 && "CATALYST ATHLETICS LEVELS"}
          {assessments.length > 0 && generalAssessments.length > 0 && " + "}
          {generalAssessments.length > 0 && "GENERAL STRENGTH STANDARDS"}
        </p>
      </div>

      {assessments.length > 0 && (
        <div>
          <h4 className="mb-3 font-headline text-sm font-bold uppercase tracking-widest text-on-surface-variant">
            OLYMPIC LIFTS
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {assessments.map((a) => (
              <LiftGauge key={a.standardLift} assessment={a} />
            ))}
          </div>
        </div>
      )}

      {generalAssessments.length > 0 && (
        <div>
          <h4 className="mb-3 font-headline text-sm font-bold uppercase tracking-widest text-on-surface-variant">
            GENERAL STRENGTH
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {generalAssessments.map((a) => (
              <GeneralLiftGauge key={a.liftName} assessment={a} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
