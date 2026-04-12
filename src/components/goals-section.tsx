"use client";

import { useState, useTransition } from "react";
import { createGoal, deleteGoal } from "@/app/actions";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

interface Goal {
  id: number;
  liftName: string;
  targetWeight: number;
  targetDate: string | null;
  currentMax: number | null;
  completedAt: Date | null;
}

interface GoalsSectionProps {
  goals: Goal[];
  liftOptions: string[];
}

export function GoalsSection({ goals, liftOptions }: GoalsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedLift, setSelectedLift] = useState(liftOptions[0] || "");
  const [targetWeight, setTargetWeight] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [isPending, startTransition] = useTransition();

  const activeGoals = goals.filter((g) => !g.completedAt);
  const completedGoals = goals.filter((g) => g.completedAt);

  function handleCreate() {
    if (!selectedLift || !targetWeight) return;
    startTransition(async () => {
      try {
        await createGoal({
          liftName: selectedLift,
          targetWeight: parseFloat(targetWeight),
          targetDate: targetDate || undefined,
        });
        toast.success("Goal created");
        setShowForm(false);
        setTargetWeight("");
        setTargetDate("");
      } catch {
        toast.error("Failed to create goal");
      }
    });
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      try {
        await deleteGoal(id);
        toast.success("Goal removed");
      } catch {
        toast.error("Failed to remove goal");
      }
    });
  }

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="font-headline text-xl font-black uppercase tracking-tighter">
          GOALS
        </h3>
        {!showForm && liftOptions.length > 0 && (
          <button
            onClick={() => setShowForm(true)}
            className="squishy text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
          >
            + ADD GOAL
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-4 flex flex-col gap-3 bg-surface-container-high p-5">
          <select
            value={selectedLift}
            onChange={(e) => setSelectedLift(e.target.value)}
            className="bg-surface-container px-3 py-2 font-headline text-sm font-bold uppercase text-on-surface outline-none"
          >
            {liftOptions.map((lift) => (
              <option key={lift} value={lift}>
                {lift}
              </option>
            ))}
          </select>

          <div className="flex gap-3">
            <input
              type="number"
              step="0.5"
              placeholder="TARGET KG"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
              className="flex-1 bg-surface-container px-3 py-2 font-headline text-sm font-bold text-on-surface outline-none placeholder:text-outline"
            />
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="bg-surface-container px-3 py-2 font-headline text-sm font-bold text-on-surface outline-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={isPending || !targetWeight}
              className="squishy flex-1 bg-primary-container py-2 text-[10px] font-bold uppercase tracking-widest text-on-primary-fixed disabled:opacity-50"
            >
              {isPending ? "..." : "SET GOAL"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="squishy bg-surface-variant px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      {activeGoals.length === 0 && !showForm && (
        <div className="bg-surface-container-high p-8 text-center">
          <span className="material-symbols-outlined mb-2 text-3xl text-outline">
            flag
          </span>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            NO ACTIVE GOALS — SET ONE TO TRACK YOUR PROGRESS
          </p>
        </div>
      )}

      <div className="flex flex-col gap-px">
        {activeGoals.map((goal) => {
          const progress = goal.currentMax
            ? Math.min(100, Math.round((goal.currentMax / goal.targetWeight) * 100))
            : 0;
          const remaining = goal.currentMax
            ? Math.max(0, goal.targetWeight - goal.currentMax)
            : goal.targetWeight;

          return (
            <div
              key={goal.id}
              className="bg-surface-container p-4 transition-colors hover:bg-surface-container-high"
            >
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <p className="font-headline text-sm font-bold uppercase tracking-tight">
                    {goal.liftName}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                    TARGET: {goal.targetWeight}KG
                    {goal.currentMax && ` · NOW: ${goal.currentMax}KG`}
                    {goal.targetDate &&
                      ` · BY ${format(parseISO(goal.targetDate), "MMM d").toUpperCase()}`}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(goal.id)}
                  disabled={isPending}
                  className="text-outline hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <div className="relative h-2 overflow-hidden bg-surface-variant">
                <div
                  className="absolute left-0 top-0 h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[9px] font-bold tracking-widest text-on-surface-variant">
                <span>{progress}%</span>
                <span>{remaining > 0 ? `${remaining.toFixed(1)}KG TO GO` : "GOAL MET"}</span>
              </div>
            </div>
          );
        })}
      </div>

      {completedGoals.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
            COMPLETED
          </p>
          <div className="flex flex-col gap-px">
            {completedGoals.map((goal) => (
              <div
                key={goal.id}
                className="flex items-center justify-between bg-surface-container p-3 opacity-60"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-lg text-primary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                  <div>
                    <p className="font-headline text-sm font-bold uppercase tracking-tight">
                      {goal.liftName}
                    </p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                      {goal.targetWeight}KG
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(goal.id)}
                  disabled={isPending}
                  className="text-outline hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
