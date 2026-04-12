"use client";

import Link from "next/link";
import { deleteWorkout } from "@/app/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Workout {
  id: number;
  date: string;
  title: string;
  classType: string;
}

export function AdminWorkoutsClient({
  upcoming,
  recent,
}: {
  upcoming: Workout[];
  recent: Workout[];
}) {
  const router = useRouter();

  async function handleDelete(id: number) {
    if (!confirm("Delete this workout?")) return;
    try {
      await deleteWorkout(id);
      toast.success("Deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete");
    }
  }

  function WorkoutRow({ workout }: { workout: Workout }) {
    return (
      <div className="flex items-center justify-between border-b border-surface-container-highest px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xs tabular-nums text-outline">
            {new Date(workout.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
          </span>
          <span className="text-sm font-bold text-on-surface">{workout.title}</span>
          <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest ${
            workout.classType === "CROSSFIT" ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-400"
          }`}>
            {workout.classType}
          </span>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/workouts/edit/${workout.id}`}
            className="text-[10px] font-bold uppercase tracking-widest text-primary"
          >
            EDIT
          </Link>
          <button
            onClick={() => handleDelete(workout.id)}
            className="text-[10px] font-bold uppercase tracking-widest text-error"
          >
            DEL
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Action buttons */}
      <div className="flex gap-3">
        <Link
          href="/admin/workouts/new"
          className="squishy flex-1 bg-primary py-3 text-center font-headline text-[11px] font-bold uppercase tracking-widest text-on-primary"
        >
          + NEW WORKOUT
        </Link>
        <Link
          href="/admin/workouts/upload"
          className="flex-1 border border-surface-container-highest py-3 text-center text-[11px] font-bold uppercase tracking-widest text-outline"
        >
          UPLOAD CSV
        </Link>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section>
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            UPCOMING
          </span>
          <div className="bg-surface-container">
            {upcoming.map((w) => <WorkoutRow key={w.id} workout={w} />)}
          </div>
        </section>
      )}

      {/* Recent */}
      {recent.length > 0 && (
        <section>
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            RECENT
          </span>
          <div className="bg-surface-container">
            {recent.map((w) => <WorkoutRow key={w.id} workout={w} />)}
          </div>
        </section>
      )}

      {upcoming.length === 0 && recent.length === 0 && (
        <div className="py-12 text-center text-xs text-outline">
          No workouts yet — create your first one!
        </div>
      )}
    </div>
  );
}
