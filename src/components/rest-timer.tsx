"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";

const REST_DURATIONS: Record<string, number> = {
  "OLYMPIC LIFT": 180,
  "STRENGTH 1": 120,
  "STRENGTH 2": 120,
  "STRENGTH 3": 120,
  ACCESSORY: 60,
};
const DEFAULT_DURATION = 120;

interface RestTimerContextValue {
  startTimer: (sectionType: string) => void;
}

const RestTimerContext = createContext<RestTimerContextValue>({
  startTimer: () => {},
});

export function useRestTimer() {
  return useContext(RestTimerContext);
}

export function RestTimerProvider({ children }: { children: React.ReactNode }) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [label, setLabel] = useState("");
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    setSecondsLeft(0);
    setTotalSeconds(0);
    setFinished(false);
    setLabel("");
  }, [clearTimer]);

  const startTimer = useCallback(
    (sectionType: string) => {
      clearTimer();
      setFinished(false);
      const duration = REST_DURATIONS[sectionType] ?? DEFAULT_DURATION;
      setTotalSeconds(duration);
      setSecondsLeft(duration);
      setLabel(sectionType);

      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
            setFinished(true);
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate([200, 100, 200, 100, 200]);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [clearTimer]
  );

  useEffect(() => {
    if (finished) {
      dismissTimeoutRef.current = setTimeout(dismiss, 4000);
    }
  }, [finished, dismiss]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const adjustTime = useCallback(
    (delta: number) => {
      setSecondsLeft((prev) => {
        const next = Math.max(0, prev + delta);
        if (next === 0 && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setFinished(true);
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 200]);
          }
        }
        return next;
      });
      setTotalSeconds((prev) => Math.max(1, prev + delta));
    },
    []
  );

  const isActive = totalSeconds > 0;

  return (
    <RestTimerContext.Provider value={{ startTimer }}>
      {children}
      {isActive && (
        <RestTimerBar
          secondsLeft={secondsLeft}
          totalSeconds={totalSeconds}
          label={label}
          finished={finished}
          onAdjust={adjustTime}
          onDismiss={dismiss}
        />
      )}
    </RestTimerContext.Provider>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface RestTimerBarProps {
  secondsLeft: number;
  totalSeconds: number;
  label: string;
  finished: boolean;
  onAdjust: (delta: number) => void;
  onDismiss: () => void;
}

function RestTimerBar({
  secondsLeft,
  totalSeconds,
  label,
  finished,
  onAdjust,
  onDismiss,
}: RestTimerBarProps) {
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;

  return (
    <div
      className={`fixed bottom-[4.5rem] left-0 right-0 z-40 mx-auto max-w-2xl transition-colors ${
        finished ? "animate-pulse" : ""
      }`}
    >
      <div
        className={`relative overflow-hidden ${
          finished
            ? "bg-primary-container"
            : "bg-surface-container-highest"
        }`}
      >
        {!finished && (
          <div
            className="absolute inset-y-0 left-0 bg-surface-bright/30 transition-[width] duration-1000 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        )}

        <div className="relative flex items-center justify-between px-4 py-3">
          <span
            className={`text-[10px] font-bold uppercase tracking-widest ${
              finished ? "text-on-primary-fixed" : "text-on-surface-variant"
            }`}
          >
            {finished ? "REST COMPLETE" : `REST — ${label}`}
          </span>

          <div className="flex items-center gap-3">
            {!finished && (
              <>
                <button
                  onClick={() => onAdjust(-30)}
                  className="flex h-7 w-7 items-center justify-center bg-surface-variant/50 text-[10px] font-bold text-on-surface-variant transition-colors hover:bg-surface-variant"
                >
                  -30
                </button>

                <span
                  className={`min-w-[3.5rem] text-center font-headline text-xl font-black tabular-nums ${
                    finished
                      ? "text-on-primary-fixed"
                      : secondsLeft <= 10
                        ? "text-primary"
                        : "text-on-surface"
                  }`}
                >
                  {formatTime(secondsLeft)}
                </span>

                <button
                  onClick={() => onAdjust(30)}
                  className="flex h-7 w-7 items-center justify-center bg-surface-variant/50 text-[10px] font-bold text-on-surface-variant transition-colors hover:bg-surface-variant"
                >
                  +30
                </button>
              </>
            )}

            <button
              onClick={onDismiss}
              className={`ml-1 ${
                finished
                  ? "text-on-primary-fixed/70 hover:text-on-primary-fixed"
                  : "text-outline hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
