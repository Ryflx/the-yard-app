import Link from "next/link";

export default function WorkoutNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
      <span className="material-symbols-outlined text-6xl text-outline">
        event_busy
      </span>
      <h2 className="font-headline text-2xl font-black uppercase tracking-tighter">
        NO WORKOUT FOUND
      </h2>
      <p className="font-label text-xs tracking-widest text-on-surface-variant">
        NOTHING PROGRAMMED FOR THIS DATE
      </p>
      <Link
        href="/schedule"
        className="squishy bg-surface-variant px-8 py-3 font-headline text-sm font-bold uppercase tracking-widest text-on-surface transition-colors hover:bg-surface-bright"
      >
        BACK TO SCHEDULE
      </Link>
    </div>
  );
}
