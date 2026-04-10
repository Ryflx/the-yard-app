import { getUserMaxes, getLiftHistory } from "@/app/actions";
import { MaxEntryForm } from "@/components/max-entry-form";
import { format, parseISO } from "date-fns";

export default async function ProgressPage() {
  const [maxes, history] = await Promise.all([
    getUserMaxes(),
    getLiftHistory(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="mb-2 font-label text-xs uppercase tracking-[0.2em] text-primary">
          ELITE PERFORMANCE TRACKER
        </p>
        <h2 className="font-headline text-4xl font-black uppercase tracking-tighter">
          YOUR PROFILE
        </h2>
      </section>

      {maxes.length > 0 && (
        <section>
          <h3 className="mb-4 font-headline text-xl font-black uppercase tracking-tighter">
            PERSONAL RECORDS
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {maxes.map((max) => (
              <div
                key={max.id}
                className="group relative overflow-hidden bg-surface-container p-6"
              >
                <span className="absolute right-4 top-4 text-[10px] font-bold uppercase tracking-widest text-primary">
                  {max.liftName}
                </span>
                <p className="mt-4 font-headline text-6xl font-black transition-transform group-hover:scale-105 group-hover:origin-left">
                  {max.maxWeight}
                </p>
                <p className="-mt-1 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  {max.unit}
                </p>
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
                    {format(max.updatedAt, "d MMM yyyy")}
                  </span>
                  <span
                    className="material-symbols-outlined text-sm text-primary"
                  >
                    trending_up
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-surface-container-high p-6">
        <p className="mb-4 font-headline text-sm font-bold uppercase tracking-widest">
          {maxes.length > 0 ? "ADD / UPDATE 1RM" : "SET YOUR FIRST 1RM"}
        </p>
        <MaxEntryForm liftName="" />
      </section>

      <section>
        <div className="mb-6 flex items-baseline justify-between">
          <h3 className="font-headline text-2xl font-black uppercase tracking-tighter">
            RECENT PERFORMANCE
          </h3>
          {history.length > 0 && (
            <span className="cursor-pointer font-label text-[10px] font-bold uppercase tracking-[0.2em] text-primary hover:underline">
              ALL HISTORY
            </span>
          )}
        </div>

        {history.length === 0 ? (
          <div className="bg-surface-container-high p-12 text-center">
            <p className="font-headline text-xl font-bold uppercase tracking-tight text-on-surface-variant">
              NO LIFTS LOGGED YET
            </p>
            <p className="mt-2 font-label text-xs tracking-widest text-outline">
              LOG YOUR FIRST SET FROM A WORKOUT
            </p>
          </div>
        ) : (
          <div className="space-y-px">
            {history.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between bg-surface-container p-4 transition-colors hover:bg-surface-container-high"
              >
                <div className="flex items-center gap-6">
                  <div className="flex h-12 w-12 flex-col items-center justify-center bg-surface-variant">
                    <span className="text-[10px] font-black leading-none">
                      {format(parseISO(log.date), "MMM").toUpperCase()}
                    </span>
                    <span className="text-lg font-black leading-none">
                      {format(parseISO(log.date), "d")}
                    </span>
                  </div>
                  <div>
                    <p className="font-headline text-sm font-bold uppercase tracking-tight">
                      {log.liftName}
                    </p>
                    <p className="text-[10px] font-medium uppercase tracking-widest text-on-surface-variant">
                      {log.reps && `${log.reps} reps`}
                      {log.sets && ` · ${log.sets} sets`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-headline text-xl font-bold text-on-surface">
                    {log.weight} {log.unit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
