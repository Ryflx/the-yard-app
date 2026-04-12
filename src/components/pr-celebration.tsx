"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface PRData {
  liftName: string;
  weight: number;
  unit: string;
  previousBest: number | null;
}

interface PRCelebrationContextValue {
  celebrate: (data: PRData) => void;
}

const PRCelebrationContext = createContext<PRCelebrationContextValue>({
  celebrate: () => {},
});

export function usePRCelebration() {
  return useContext(PRCelebrationContext);
}

export function PRCelebrationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pr, setPR] = useState<PRData | null>(null);
  const [visible, setVisible] = useState(false);

  const celebrate = useCallback((data: PRData) => {
    setPR(data);
    setVisible(true);
    setTimeout(() => setVisible(false), 3500);
  }, []);

  return (
    <PRCelebrationContext.Provider value={{ celebrate }}>
      {children}
      {visible && pr && <PROverlay pr={pr} onDismiss={() => setVisible(false)} />}
    </PRCelebrationContext.Provider>
  );
}

function PROverlay({
  pr,
  onDismiss,
}: {
  pr: PRData;
  onDismiss: () => void;
}) {
  const delta =
    pr.previousBest != null
      ? `+${(pr.weight - pr.previousBest).toFixed(1)}${pr.unit}`
      : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={onDismiss}
    >
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative flex flex-col items-center gap-4 px-8 py-10 animate-in zoom-in-75 fade-in duration-300">
        <span
          className="material-symbols-outlined text-6xl text-primary"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          emoji_events
        </span>

        <p className="font-label text-xs font-bold uppercase tracking-[0.3em] text-primary">
          NEW PERSONAL RECORD
        </p>

        <div className="flex items-baseline gap-2">
          <span className="font-headline text-6xl font-black text-white">
            {pr.weight}
          </span>
          <span className="font-headline text-2xl font-bold uppercase text-on-surface-variant">
            {pr.unit}
          </span>
        </div>

        <p className="font-headline text-lg font-bold uppercase tracking-tight text-primary-container">
          {pr.liftName}
        </p>

        {delta && (
          <span className="mt-1 bg-primary-container px-4 py-1.5 font-headline text-sm font-black text-on-primary-fixed">
            {delta} FROM PREVIOUS BEST
          </span>
        )}
      </div>
    </div>
  );
}
