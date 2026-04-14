"use client";

import { useState, useTransition } from "react";
import { setUserMax, deleteUserMax } from "@/app/actions";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { LIFT_CATALOG } from "@/lib/lift-catalog";

interface MaxEntry {
  id: number;
  liftName: string;
  maxWeight: number;
  unit: string;
  updatedAt: Date;
}

interface ProfileMaxesProps {
  maxes: MaxEntry[];
}

export function ProfileMaxes({ maxes: initialMaxes }: ProfileMaxesProps) {
  const [maxes, setMaxes] = useState(initialMaxes);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newLift, setNewLift] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [isPending, startTransition] = useTransition();

  const existingLifts = new Set(maxes.map((m) => m.liftName.toLowerCase()));
  const availableGroups = LIFT_CATALOG.map((g) => ({
    ...g,
    lifts: g.lifts.filter((l) => !existingLifts.has(l.toLowerCase())),
  })).filter((g) => g.lifts.length > 0);

  function handleAdd() {
    const val = parseFloat(newWeight);
    if (!newLift || isNaN(val) || val <= 0) return;

    startTransition(async () => {
      try {
        await setUserMax(newLift, val);
        setMaxes((prev) => [
          ...prev,
          {
            id: Date.now(),
            liftName: newLift,
            maxWeight: val,
            unit: "kg",
            updatedAt: new Date(),
          },
        ]);
        toast.success(`${newLift} 1RM set to ${val}kg`);
        setShowAdd(false);
        setNewLift("");
        setNewWeight("");
      } catch {
        toast.error("Failed to add");
      }
    });
  }

  function startEdit(m: MaxEntry) {
    setEditingId(m.id);
    setEditWeight(m.maxWeight.toString());
  }

  function cancelEdit() {
    setEditingId(null);
    setEditWeight("");
  }

  function handleSave(m: MaxEntry) {
    const val = parseFloat(editWeight);
    if (isNaN(val) || val <= 0) return;

    startTransition(async () => {
      try {
        await setUserMax(m.liftName, val);
        setMaxes((prev) =>
          prev.map((x) =>
            x.id === m.id ? { ...x, maxWeight: val, updatedAt: new Date() } : x
          )
        );
        toast.success(`${m.liftName} updated to ${val}${m.unit}`);
        setEditingId(null);
      } catch {
        toast.error("Failed to update");
      }
    });
  }

  function handleDelete(m: MaxEntry) {
    if (!confirm(`Delete 1RM record for ${m.liftName}?`)) return;
    startTransition(async () => {
      try {
        await deleteUserMax(m.liftName);
        setMaxes((prev) => prev.filter((x) => x.id !== m.id));
        toast.success(`${m.liftName} 1RM removed`);
      } catch {
        toast.error("Failed to delete");
      }
    });
  }

  const addForm = showAdd && (
    <div className="flex flex-col gap-3 bg-surface-container-high p-5">
      <select
        value={newLift}
        onChange={(e) => setNewLift(e.target.value)}
        className="bg-surface-container px-3 py-2 font-headline text-sm font-bold uppercase text-on-surface outline-none"
      >
        <option value="">SELECT LIFT...</option>
        {availableGroups.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.lifts.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <div className="flex gap-2">
        <input
          type="number"
          step="0.5"
          min="0"
          placeholder="KG"
          value={newWeight}
          onChange={(e) => setNewWeight(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          className="flex-1 bg-surface-container px-3 py-2 font-headline text-sm font-bold text-on-surface outline-none placeholder:text-outline"
        />
        <button
          onClick={handleAdd}
          disabled={isPending || !newLift || !newWeight}
          className="squishy bg-primary-container px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-on-primary-fixed disabled:opacity-50"
        >
          {isPending ? "..." : "ADD"}
        </button>
        <button
          onClick={() => {
            setShowAdd(false);
            setNewLift("");
            setNewWeight("");
          }}
          className="squishy bg-surface-variant px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant"
        >
          CANCEL
        </button>
      </div>
    </div>
  );

  if (maxes.length === 0) {
    return (
      <div className="flex flex-col gap-px">
        <div className="bg-surface-container p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-lg text-on-surface-variant">
                fitness_center
              </span>
              <div>
                <p className="font-headline text-sm font-bold uppercase tracking-tight">
                  YOUR 1RM RECORDS
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  NO MAXES SET YET — ADD ONE OR LOG A LIFT
                </p>
              </div>
            </div>
            {!showAdd && (
              <button
                onClick={() => setShowAdd(true)}
                className="squishy shrink-0 bg-primary-container px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-on-primary-fixed"
              >
                + ADD
              </button>
            )}
          </div>
        </div>
        {addForm}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-px">
      <div className="flex items-center justify-between gap-3 bg-surface-container px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-lg text-primary">
            fitness_center
          </span>
          <p className="font-headline text-sm font-bold uppercase tracking-tight">
            YOUR 1RM RECORDS
          </p>
        </div>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="squishy bg-primary-container px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-on-primary-fixed"
          >
            + ADD
          </button>
        )}
      </div>
      {addForm}

      {maxes.map((m) => (
        <div
          key={m.id}
          className="flex items-center justify-between bg-surface-container px-5 py-3"
        >
          <div className="flex flex-col gap-0.5">
            <p className="font-headline text-sm font-bold uppercase tracking-tight text-on-surface">
              {m.liftName}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
              UPDATED {formatDistanceToNow(m.updatedAt, { addSuffix: true }).toUpperCase()}
            </p>
          </div>

          {editingId === m.id ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="0"
                value={editWeight}
                onChange={(e) => setEditWeight(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave(m);
                  if (e.key === "Escape") cancelEdit();
                }}
                className="w-16 border-0 border-b-2 border-outline-variant bg-transparent p-0 py-1 text-center font-headline text-sm font-bold text-on-surface focus:border-primary focus:ring-0"
              />
              <span className="text-[10px] font-bold text-on-surface-variant">{m.unit}</span>
              <button
                onClick={() => handleSave(m)}
                disabled={isPending}
                className="squishy bg-primary-container px-2.5 py-1 text-[9px] font-bold text-on-primary-fixed disabled:opacity-50"
              >
                {isPending ? "..." : "OK"}
              </button>
              <button
                onClick={cancelEdit}
                className="text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-headline text-lg font-black text-primary-container">
                {m.maxWeight}
              </span>
              <span className="text-[10px] font-bold uppercase text-on-surface-variant">
                {m.unit}
              </span>
              <button
                onClick={() => startEdit(m)}
                className="ml-1 flex h-7 w-7 items-center justify-center bg-surface-variant text-on-surface-variant transition-colors hover:bg-surface-bright hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
              </button>
              <button
                onClick={() => handleDelete(m)}
                disabled={isPending}
                className="flex h-7 w-7 items-center justify-center bg-surface-variant text-on-surface-variant transition-colors hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
