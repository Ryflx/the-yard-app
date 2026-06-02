"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { activatePlan, endPlan } from "@/app/actions";
import type { TrackSummary } from "@/app/actions";

interface Props {
  tracks: TrackSummary[];
}

const STATUS_LABELS: Record<TrackSummary["status"], string> = {
  active: "ACTIVE",
  paused: "PAUSED",
  completed: "DONE",
};

const STATUS_STYLES: Record<TrackSummary["status"], string> = {
  active:
    "bg-primary-container text-on-primary-fixed",
  paused:
    "bg-surface-container-high text-on-surface-variant",
  completed:
    "bg-surface-container text-on-surface-variant opacity-60",
};

export function TrackLibrary({ tracks }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handle(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  function onActivate(track: TrackSummary) {
    const msg =
      track.status === "paused"
        ? `Resume "${track.name}"? Your current active track will be paused.`
        : `Switch to "${track.name}"? Your current active track will be paused.`;
    if (!confirm(msg)) return;
    handle(() => activatePlan(track.id));
  }

  function onEnd(track: TrackSummary) {
    if (
      !confirm(
        `End "${track.name}"? Upcoming sessions will be removed — completed ones stay in your history.`
      )
    )
      return;
    handle(() => endPlan(track.id));
  }

  if (tracks.length === 0) return null;

  return (
    <section className="px-4 pb-10">
      <div className="flex items-center justify-between border-t border-outline-variant pt-6">
        <h2 className="font-headline text-xs font-black uppercase tracking-widest text-on-surface-variant">
          My Tracks
        </h2>
        <Link
          href="/programming/new"
          className="text-[10px] font-bold uppercase tracking-widest text-primary-container"
        >
          + New track
        </Link>
      </div>

      <ul className="mt-3 space-y-3">
        {tracks.map((track) => {
          const pct =
            track.progress.total > 0
              ? Math.round((track.progress.completed / track.progress.total) * 100)
              : 0;

          return (
            <li
              key={track.id}
              className={`border border-outline-variant bg-surface-container p-4${track.status === "active" ? " border-primary-container" : ""}`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-headline text-sm font-black uppercase tracking-tight">
                    {track.name}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-widest text-on-surface-variant">
                    {track.startsOn} → {track.endsOn} · {track.planLengthWeeks}W
                  </p>
                </div>
                <span
                  className={`shrink-0 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${STATUS_STYLES[track.status]}`}
                >
                  {STATUS_LABELS[track.status]}
                </span>
              </div>

              {/* Courses */}
              {track.courseNames.length > 0 && (
                <p className="mt-2 text-[10px] uppercase tracking-widest text-on-surface-variant">
                  {track.courseNames.join(" · ")}
                </p>
              )}

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                    Progress
                  </span>
                  <span className="text-[10px] font-bold text-on-surface-variant">
                    {track.progress.completed}/{track.progress.total} ({pct}%)
                  </span>
                </div>
                <div className="mt-1 h-1 w-full bg-outline-variant">
                  <div
                    className="h-1 bg-primary-container transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Actions */}
              {track.status !== "completed" && (
                <div className="mt-3 flex items-center gap-4">
                  {track.status !== "active" && (
                    <button
                      onClick={() => onActivate(track)}
                      disabled={pending}
                      className="bg-primary-container px-4 py-2 font-headline text-[10px] font-black uppercase tracking-widest text-on-primary-fixed disabled:opacity-50"
                    >
                      {track.status === "paused" ? "Resume" : "Switch to this"}
                    </button>
                  )}
                  <button
                    onClick={() => onEnd(track)}
                    disabled={pending}
                    className="py-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant disabled:opacity-50"
                  >
                    End track
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
