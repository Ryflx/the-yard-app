"use client";

import { useState, useTransition } from "react";
import { swapDrillSession } from "@/app/actions";
import { useRouter } from "next/navigation";

interface Props {
  sessionId: number;
}

export function SwapDrillSheet({ sessionId }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSwap() {
    setError(null);
    startTransition(async () => {
      try {
        await swapDrillSession(sessionId);
        setOpen(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Swap failed");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface"
      >
        Swap this session
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-surface-container p-6">
            <h3 className="font-headline text-sm font-black uppercase tracking-widest">Swap drill</h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              We&apos;ll replace this session with the next available drill from the same course.
            </p>
            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={pending}
                className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-on-surface-variant"
              >
                Cancel
              </button>
              <button
                onClick={handleSwap}
                disabled={pending}
                className="flex-1 bg-[#cafd00] py-3 font-headline text-xs font-black uppercase tracking-widest text-black disabled:opacity-50"
              >
                {pending ? "Swapping…" : "Swap"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
