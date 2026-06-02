"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { regeneratePlan, pausePlan, endPlan } from "@/app/actions";
import { useRouter } from "next/navigation";
import type { customPlans, customPlanSessions, skillDrills, skillCourses, workouts } from "@/db/schema";

type Plan = typeof customPlans.$inferSelect;
type SessionRow = {
  session: typeof customPlanSessions.$inferSelect;
  drill: typeof skillDrills.$inferSelect;
  course: typeof skillCourses.$inferSelect;
  workout: typeof workouts.$inferSelect | null;
};

interface Props {
  plan: Plan;
  sessions: SessionRow[];
}

type SessionStatus = "pending" | "completed" | "skipped" | "swapped";

const STATUS_STYLES: Record<SessionStatus, string> = {
  completed: "text-primary-container",
  pending: "text-on-surface-variant",
  skipped: "text-on-surface-variant opacity-40",
  swapped: "text-on-surface-variant",
};

const STATUS_LABELS: Record<SessionStatus, string> = {
  completed: "DONE",
  pending: "UPCOMING",
  skipped: "SKIPPED",
  swapped: "SWAPPED",
};

function isoWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  // Get Monday of that week
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (dt: Date) =>
    dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${fmt(mon)} – ${fmt(sun)}`;
}

function groupByWeek(sessions: SessionRow[]): { weekKey: string; label: string; rows: SessionRow[] }[] {
  const map = new Map<string, SessionRow[]>();
  for (const s of sessions) {
    const date = s.session.plannedDate ?? s.workout?.date ?? "";
    if (!date) continue;
    // Week key = Monday date
    const d = new Date(date + "T00:00:00");
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    const key = mon.toISOString().slice(0, 10);
    const list = map.get(key) ?? [];
    list.push(s);
    map.set(key, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, rows]) => ({ weekKey: key, label: isoWeekLabel(rows[0].session.plannedDate ?? rows[0].workout?.date ?? key), rows }));
}

export function ActivePlanOverview({ plan, sessions }: Props) {
  const [pending, startTransition] = useTransition();
  const [showAll, setShowAll] = useState(false);
  const router = useRouter();

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = sessions
    .filter((s) => {
      const date = s.session.plannedDate ?? s.workout?.date;
      return date != null && date >= today;
    })
    .slice(0, 7);

  const progressByCourse = new Map<number, { name: string; done: number; total: number }>();
  for (const s of sessions) {
    const m = progressByCourse.get(s.course.id) ?? { name: s.course.name, done: 0, total: 0 };
    m.total += 1;
    if (s.session.status === "completed") m.done += 1;
    progressByCourse.set(s.course.id, m);
  }

  const weekGroups = groupByWeek(sessions);

  function handle(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 px-4 py-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary-container">
          YOUR PLAN
        </p>
        <h1 className="mt-1 font-headline text-2xl font-black uppercase tracking-tight">{plan.name}</h1>
        <p className="mt-1 text-xs text-on-surface-variant">
          {plan.startsOn} → {plan.endsOn} · {plan.status.toUpperCase()}
        </p>
      </div>

      {/* Next 7 days */}
      <section>
        <h2 className="font-headline text-xs font-black uppercase tracking-widest text-on-surface-variant">
          Next 7 days
        </h2>
        <ul className="mt-2 space-y-1">
          {upcoming.length === 0 && (
            <li className="text-sm text-on-surface-variant">No upcoming sessions</li>
          )}
          {upcoming.map((s) => {
            const date = s.session.plannedDate ?? s.workout?.date;
            return (
              <li
                key={s.session.id}
                className="flex items-center justify-between border-b border-outline-variant py-2"
              >
                <div>
                  <p className="text-sm">{s.drill.title}</p>
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                    {date} · {s.course.name}
                  </p>
                </div>
                {s.workout && (
                  <Link
                    href={`/workout/${s.workout.date}?class=CUSTOM`}
                    className="text-[10px] font-bold uppercase tracking-widest text-primary-container"
                  >
                    Open
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Progress by course */}
      <section>
        <h2 className="font-headline text-xs font-black uppercase tracking-widest text-on-surface-variant">
          Progress
        </h2>
        <ul className="mt-2 space-y-1">
          {Array.from(progressByCourse.values()).map((p) => (
            <li key={p.name} className="flex items-center justify-between py-1">
              <span className="text-sm">{p.name}</span>
              <span className="text-xs text-on-surface-variant">
                {p.done}/{p.total} ({Math.round((p.done / p.total) * 100)}%)
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* All sessions collapsible */}
      <section>
        <button
          onClick={() => setShowAll((v) => !v)}
          className="flex w-full items-center justify-between border-b border-outline-variant pb-2"
        >
          <h2 className="font-headline text-xs font-black uppercase tracking-widest text-on-surface-variant">
            All Sessions
          </h2>
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            {showAll ? "Hide" : `Show ${sessions.length}`}
          </span>
        </button>

        {showAll && (
          <div className="mt-2 space-y-4">
            {weekGroups.map(({ weekKey, label, rows }) => (
              <div key={weekKey}>
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {label}
                </p>
                <ul className="space-y-0">
                  {rows.map((s) => {
                    const status = s.session.status as SessionStatus;
                    const date = s.session.plannedDate ?? s.workout?.date;
                    return (
                      <li
                        key={s.session.id}
                        className="flex items-center justify-between border-b border-outline-variant py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm">{s.drill.title}</p>
                          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                            {date} · {s.course.name}
                          </p>
                        </div>
                        <div className="ml-2 flex shrink-0 items-center gap-2">
                          <span
                            className={`text-[9px] font-black uppercase tracking-widest ${STATUS_STYLES[status]}`}
                          >
                            {STATUS_LABELS[status]}
                          </span>
                          {s.workout && status !== "completed" && (
                            <Link
                              href={`/workout/${s.workout.date}?class=CUSTOM`}
                              className="text-[10px] font-bold uppercase tracking-widest text-primary-container"
                            >
                              Open
                            </Link>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Actions */}
      <section className="flex flex-col gap-2 border-t border-outline-variant pt-4">
        <button
          onClick={() => {
            if (!confirm("Regenerate this plan? Your current plan will be marked completed.")) return;
            handle(() => regeneratePlan(plan.id));
          }}
          disabled={pending}
          className="bg-primary-container py-3 font-headline text-xs font-black uppercase tracking-widest text-on-primary-fixed disabled:opacity-50"
        >
          {pending ? "…" : "REGENERATE PLAN"}
        </button>
        <button
          onClick={() => handle(() => pausePlan(plan.id))}
          disabled={pending || plan.status !== "active"}
          className="py-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant disabled:opacity-50"
        >
          Pause
        </button>
        <button
          onClick={() => {
            if (!confirm("End this track? Upcoming sessions will be removed — completed ones stay in your history.")) return;
            handle(() => endPlan(plan.id));
          }}
          disabled={pending}
          className="py-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant disabled:opacity-50"
        >
          End track
        </button>
      </section>
    </div>
  );
}
