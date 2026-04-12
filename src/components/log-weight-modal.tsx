"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { logLift } from "@/app/actions";
import { toast } from "sonner";

interface LogWeightModalProps {
  date: string;
  workoutId?: number;
  liftOptions: string[];
  defaultLiftName?: string;
}

export function LogWeightModal({
  date,
  workoutId,
  liftOptions,
  defaultLiftName,
}: LogWeightModalProps) {
  const [open, setOpen] = useState(false);
  const [liftName, setLiftName] = useState(defaultLiftName ?? liftOptions[0] ?? "");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [sets, setSets] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0 || !liftName) return;

    setLoading(true);
    try {
      await logLift({
        workoutId,
        date,
        liftName,
        weight: w,
        reps: reps ? parseInt(reps) : undefined,
        sets: sets ? parseInt(sets) : undefined,
      });
      toast.success(`Logged ${w}kg for ${liftName}`);
      setOpen(false);
      setWeight("");
      setReps("");
      setSets("");
    } catch {
      toast.error("Failed to log");
    } finally {
      setLoading(false);
    }
  }

  const singleLift = liftOptions.length <= 1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="squishy flex w-full items-center justify-center gap-2 bg-primary-fixed py-4 font-headline font-black uppercase tracking-widest text-on-primary-fixed">
          <span className="material-symbols-outlined">add_task</span>
          LOG SET
        </button>
      </DialogTrigger>
      <DialogContent className="border-0 bg-surface-container-high p-0 sm:max-w-md">
        <DialogHeader className="border-b border-outline-variant/20 p-6 pb-4">
          <DialogTitle className="font-headline text-xl font-black uppercase tracking-tighter">
            LOG WEIGHT
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-6">
          <div>
            <label className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              EXERCISE
            </label>
            {singleLift ? (
              <p className="mt-1 py-2 font-headline text-lg font-bold uppercase tracking-tight text-on-surface">
                {liftName}
              </p>
            ) : (
              <div className="mt-1 flex flex-col gap-2">
                {liftOptions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setLiftName(name)}
                    className={`w-full px-4 py-3 text-left font-headline text-sm font-bold uppercase tracking-tight transition-colors ${
                      liftName === name
                        ? "bg-primary-container text-on-primary-fixed"
                        : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-variant"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                WEIGHT (KG)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0"
                className="mt-1 w-full border-0 border-b-2 border-outline-variant bg-surface-container-lowest p-0 py-2 font-headline text-3xl font-bold transition-colors placeholder:text-outline focus:border-primary focus:ring-0"
              />
            </div>
            <div>
              <label className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                REPS
              </label>
              <input
                type="number"
                min="1"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="1"
                className="mt-1 w-full border-0 border-b-2 border-outline-variant bg-surface-container-lowest p-0 py-2 font-headline text-3xl font-bold transition-colors placeholder:text-outline focus:border-primary focus:ring-0"
              />
            </div>
            <div>
              <label className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                SETS
              </label>
              <input
                type="number"
                min="1"
                value={sets}
                onChange={(e) => setSets(e.target.value)}
                placeholder="1"
                className="mt-1 w-full border-0 border-b-2 border-outline-variant bg-surface-container-lowest p-0 py-2 font-headline text-3xl font-bold transition-colors placeholder:text-outline focus:border-primary focus:ring-0"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="digital-texture w-full py-4 font-headline font-black uppercase tracking-widest text-on-primary-fixed transition-transform duration-150 disabled:opacity-50 active:scale-95"
          >
            {loading ? "SAVING..." : "SAVE"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
