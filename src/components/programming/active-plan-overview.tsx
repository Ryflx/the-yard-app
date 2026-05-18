"use client";

import { useTransition } from "react";
import Link from "next/link";
import { regeneratePlan, pausePlan, markPlanCompleted } from "@/app/actions";
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

export function ActivePlanOverview({ plan, sessions }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = sessions
    .filter((s) => s.workout?.date != null && s.workout.date >= today)
    .slice(0, 7);

  const progressByCourse = new Map<number, { name: string; done: number; total: number }>();
  for (const s of sessions) {
    const m = progressByCourse.get(s.course.id) ?? { name: s.course.name, done: 0, total: 0 };
    m.total += 1;
    if (s.session.status === "completed") m.done += 1;
    progressByCourse.set(s.course.id, m);
  }

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

      <section>
        <h2 className="font-headline text-xs font-black uppercase tracking-widest text-on-surface-variant">
          Next 7 days
        </h2>
        <ul className="mt-2 space-y-1">
          {upcoming.length === 0 && (
            <li className="text-sm text-on-surface-variant">No upcoming sessions</li>
          )}
          {upcoming.map((s) => (
            <li
              key={s.session.id}
              className="flex items-center justify-between border-b border-outline-variant py-2"
            >
              <div>
                <p className="text-sm">{s.drill.title}</p>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                  {s.workout?.date} · {s.course.name}
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
          ))}
        </ul>
      </section>

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
          onClick={() => handle(() => markPlanCompleted(plan.id))}
          disabled={pending}
          className="py-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant disabled:opacity-50"
        >
          Mark as completed
        </button>
      </section>
    </div>
  );
}
