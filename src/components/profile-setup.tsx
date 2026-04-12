"use client";

import { useState } from "react";
import { updateUserProfile } from "@/app/actions";
import { toast } from "sonner";

interface ProfileSetupProps {
  currentName?: string;
  currentWeight?: number;
  currentSex?: "male" | "female";
  compact?: boolean;
}

export function ProfileSetup({
  currentName,
  currentWeight,
  currentSex,
  compact,
}: ProfileSetupProps) {
  const [displayName, setDisplayName] = useState(currentName ?? "");
  const [bodyweight, setBodyweight] = useState(currentWeight?.toString() ?? "");
  const [sex, setSex] = useState<"male" | "female">(currentSex ?? "male");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(!compact);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const bw = parseFloat(bodyweight);
    if (isNaN(bw) || bw <= 0) {
      toast.error("Enter a valid bodyweight");
      return;
    }

    setLoading(true);
    try {
      await updateUserProfile({
        displayName: displayName.trim(),
        bodyweightKg: bw,
        sex,
      });
      toast.success("Profile updated");
      setEditing(false);
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setLoading(false);
    }
  }

  if (compact && !editing) {
    return (
      <div className="flex flex-col gap-px">
        <div className="flex items-center justify-between bg-surface-container px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-lg text-primary">person</span>
            <div>
              <p className="font-headline text-sm font-bold uppercase tracking-tight">
                {currentName || "NO NAME SET"}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                {currentWeight}KG · {(currentSex ?? "male").toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="flex h-8 w-8 items-center justify-center bg-surface-variant text-on-surface-variant transition-colors hover:bg-surface-bright hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-base">edit</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 bg-surface-container-high p-5">
      {!compact && (
        <div>
          <p className="mb-1 font-headline text-sm font-bold uppercase tracking-widest">
            SET UP YOUR PROFILE
          </p>
          <p className="font-label text-xs tracking-wide text-on-surface-variant">
            Used to calculate your strength level against the Catalyst Athletics standards
          </p>
        </div>
      )}

      <div>
        <label className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          DISPLAY NAME
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="How you want to be known"
          className="mt-1 w-full border-0 border-b-2 border-outline-variant bg-transparent p-0 py-2 font-headline text-lg font-bold transition-colors placeholder:text-outline focus:border-primary focus:ring-0"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setSex("male")}
          className={`squishy flex-1 py-3 font-headline text-xs font-bold uppercase tracking-widest transition-colors ${
            sex === "male"
              ? "bg-primary-container text-on-primary-fixed"
              : "bg-surface-container text-on-surface-variant hover:bg-surface-variant"
          }`}
        >
          <span className="material-symbols-outlined mb-0.5 block text-xl">male</span>
          MALE
        </button>
        <button
          type="button"
          onClick={() => setSex("female")}
          className={`squishy flex-1 py-3 font-headline text-xs font-bold uppercase tracking-widest transition-colors ${
            sex === "female"
              ? "bg-primary-container text-on-primary-fixed"
              : "bg-surface-container text-on-surface-variant hover:bg-surface-variant"
          }`}
        >
          <span className="material-symbols-outlined mb-0.5 block text-xl">female</span>
          FEMALE
        </button>
      </div>

      <div>
        <label className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          BODYWEIGHT (KG)
        </label>
        <input
          type="number"
          step="0.1"
          min="30"
          max="200"
          value={bodyweight}
          onChange={(e) => setBodyweight(e.target.value)}
          placeholder="e.g. 81"
          className="mt-1 w-full border-0 border-b-2 border-outline-variant bg-transparent p-0 py-2 font-headline text-2xl font-black transition-colors placeholder:text-outline focus:border-primary focus:ring-0"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="digital-texture flex-1 py-3 font-headline text-sm font-black uppercase tracking-widest text-on-primary-fixed transition-transform duration-150 disabled:opacity-50 active:scale-95"
        >
          {loading ? "SAVING..." : "SAVE"}
        </button>
        {compact && (
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setDisplayName(currentName ?? "");
              setBodyweight(currentWeight?.toString() ?? "");
              setSex(currentSex ?? "male");
            }}
            className="bg-surface-variant px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:bg-surface-bright"
          >
            CANCEL
          </button>
        )}
      </div>
    </form>
  );
}
