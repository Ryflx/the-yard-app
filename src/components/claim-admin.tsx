"use client";

import { useState } from "react";
import { claimAdmin } from "@/app/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function ClaimAdmin() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClaim() {
    setLoading(true);
    try {
      await claimAdmin();
      toast.success("You are now an admin");
      router.refresh();
    } catch {
      toast.error("Failed to claim admin — one may already exist");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-8 py-12 text-center">
      <span className="material-symbols-outlined text-6xl text-primary-container">
        admin_panel_settings
      </span>
      <div>
        <h2 className="font-headline text-3xl font-black uppercase tracking-tighter">
          NO ADMIN SET UP
        </h2>
        <p className="mt-2 max-w-sm font-label text-xs tracking-widest text-on-surface-variant">
          This app doesn&apos;t have an admin yet. As the first person here, you
          can claim the admin role to manage workouts and users.
        </p>
      </div>
      <button
        onClick={handleClaim}
        disabled={loading}
        className="digital-texture squishy w-full max-w-xs py-4 font-headline font-black uppercase tracking-widest text-on-primary-fixed disabled:opacity-50"
      >
        {loading ? "SETTING UP..." : "CLAIM ADMIN"}
      </button>
    </div>
  );
}
