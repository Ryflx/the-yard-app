import {
  getUserMaxes,
  getLiftHistory,
  getProgrammedLiftNames,
  getUserProfile,
  getLiftChartData,
  getMonthlyRecap,
  getUserGoals,
} from "@/app/actions";
import { PRCard } from "@/components/pr-card";
import { StrengthDashboard } from "@/components/strength-dashboard";
import { LiftCharts } from "@/components/lift-chart";
import { GoalsSection } from "@/components/goals-section";
import { format, parseISO } from "date-fns";
import { normalizeLiftName } from "@/lib/percentage";
import { RecentPerformance } from "@/components/recent-performance";
import { assessStrength, assessGeneralStrength, type Sex } from "@/lib/strength-standards";
import Link from "next/link";

export default async function ProgressPage() {
  const [maxes, history, programmedLifts, profile, chartData, recap, goals] = await Promise.all([
    getUserMaxes(),
    getLiftHistory(),
    getProgrammedLiftNames(),
    getUserProfile(),
    getLiftChartData(),
    getMonthlyRecap(),
    getUserGoals(),
  ]);

  const maxesByName = new Map(
    maxes.map((m) => [normalizeLiftName(m.liftName), m])
  );

  const allLiftNames = Array.from(
    new Set([
      ...programmedLifts,
      ...maxes.map((m) => normalizeLiftName(m.liftName)),
    ])
  );

  const profileComplete = profile?.bodyweightKg != null && profile?.sex != null;

  const assessments =
    profileComplete && maxes.length > 0
      ? (() => {
          const all = maxes
            .map((m) =>
              assessStrength(
                m.liftName,
                m.maxWeight,
                profile.bodyweightKg!,
                profile.sex as Sex
              )
            )
            .filter((a): a is NonNullable<typeof a> => a !== null);

          const best = new Map<string, NonNullable<(typeof all)[0]>>();
          for (const a of all) {
            const existing = best.get(a.standardLift);
            if (!existing || a.userWeight > existing.userWeight) {
              best.set(a.standardLift, a);
            }
          }
          return Array.from(best.values());
        })()
      : [];

  const generalAssessments =
    profileComplete && maxes.length > 0
      ? (() => {
          const all = maxes
            .map((m) =>
              assessGeneralStrength(
                m.liftName,
                m.maxWeight,
                profile.bodyweightKg!,
                profile.sex as Sex
              )
            )
            .filter((a): a is NonNullable<typeof a> => a !== null);

          const best = new Map<string, NonNullable<(typeof all)[0]>>();
          for (const a of all) {
            const existing = best.get(a.liftName);
            if (!existing || a.userWeight > existing.userWeight) {
              best.set(a.liftName, a);
            }
          }
          return Array.from(best.values());
        })()
      : [];

  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="mb-2 font-label text-xs uppercase tracking-[0.2em] text-primary">
          BARBELL PERFORMANCE TRACKER
        </p>
        <h2 className="font-headline text-4xl font-black uppercase tracking-tighter">
          YOUR PROGRESS
        </h2>
      </section>

      {!profileComplete && (
        <div className="bg-surface-container-high p-6 text-center">
          <p className="font-headline text-sm font-bold uppercase tracking-tight text-on-surface-variant">
            COMPLETE YOUR PROFILE TO SEE STRENGTH LEVELS
          </p>
          <Link
            href="/profile"
            className="mt-3 inline-block bg-primary-container px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-on-primary-fixed transition-transform active:scale-95"
          >
            SET UP PROFILE
          </Link>
        </div>
      )}

      {/* Monthly Recap */}
      {recap.totalSessions > 0 && (
        <section className="bg-surface-container-high p-6">
          <div className="mb-5 flex items-baseline justify-between">
            <h3 className="font-headline text-xl font-black uppercase tracking-tighter">
              {recap.month}
            </h3>
            <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
              MONTHLY RECAP
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-container p-4">
              <p className="font-headline text-2xl font-black leading-none">
                {recap.totalSessions}
              </p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                SESSIONS
              </p>
              {recap.lastMonthSessions > 0 && (() => {
                const delta = recap.totalSessions - recap.lastMonthSessions;
                if (delta === 0) return null;
                return (
                  <p className={`mt-1 flex items-center text-[9px] font-bold ${delta > 0 ? "text-primary" : "text-red-400"}`}>
                    <span className="material-symbols-outlined text-xs">
                      {delta > 0 ? "arrow_upward" : "arrow_downward"}
                    </span>
                    {Math.abs(delta)} VS LAST MONTH
                  </p>
                );
              })()}
            </div>

            <div className="bg-surface-container p-4">
              <p className="font-headline text-2xl font-black leading-none">
                {recap.totalVolume >= 1000
                  ? `${(recap.totalVolume / 1000).toFixed(1)}k`
                  : recap.totalVolume}
              </p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                TOTAL VOLUME (KG)
              </p>
            </div>

            <div className="bg-surface-container p-4">
              <p className="font-headline text-2xl font-black leading-none text-primary">
                {recap.prsThisMonth}
              </p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                PRs HIT
              </p>
            </div>

            {recap.topLift && (
              <div className="bg-surface-container p-4">
                <p className="font-headline text-2xl font-black leading-none">
                  {recap.topLift.weight}
                  <span className="text-sm text-on-surface-variant">{recap.topLift.unit}</span>
                </p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                  TOP: {recap.topLift.name.split(" ").slice(0, 3).join(" ").toUpperCase()}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Goals */}
      <GoalsSection goals={goals} liftOptions={allLiftNames} />

      {/* Strength Dashboard (only shows if profile + maxes exist) */}
      {(assessments.length > 0 || generalAssessments.length > 0) && (
        <StrengthDashboard assessments={assessments} generalAssessments={generalAssessments} />
      )}

      {/* PR Cards */}
      <section>
        <h3 className="mb-4 font-headline text-xl font-black uppercase tracking-tighter">
          PERSONAL RECORDS
        </h3>
        {allLiftNames.length === 0 ? (
          <div className="bg-surface-container-high p-12 text-center">
            <p className="font-headline text-xl font-bold uppercase tracking-tight text-on-surface-variant">
              NO LIFTS PROGRAMMED YET
            </p>
            <p className="mt-2 font-label text-xs tracking-widest text-outline">
              1RM CARDS APPEAR ONCE WORKOUTS ARE ADDED BY THE COACH
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-px">
            {allLiftNames.map((name) => {
              const existing = maxesByName.get(name);
              return (
                <PRCard
                  key={name}
                  liftName={name}
                  maxWeight={existing?.maxWeight}
                  unit={existing?.unit ?? "kg"}
                  updatedAt={existing?.updatedAt}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Progress Charts */}
      <LiftCharts data={chartData} />

      {/* Recent Performance */}
      <RecentPerformance history={history} />
    </div>
  );
}
