"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { completeOnboarding } from "@/app/actions";
import { useRouter } from "next/navigation";

interface TourStep {
  target: string;
  title: string;
  body: string;
  position: "top" | "bottom";
}

const STEPS: TourStep[] = [
  {
    target: "class-tabs",
    title: "SWITCH CLASS TYPE",
    body: "Tap here to switch between Barbell and CrossFit classes. Each has its own workouts and tracking.",
    position: "bottom",
  },
  {
    target: "workout-card",
    title: "YOUR WORKOUT",
    body: "Tap a workout to open it. You\u2019ll see your programmed sets, percentages, and can log every lift.",
    position: "top",
  },
  {
    target: "nav-progress",
    title: "TRACK PROGRESS",
    body: "Check your strength levels, PR history, and how you stack up against established standards.",
    position: "top",
  },
  {
    target: "nav-profile",
    title: "SET UP PROFILE",
    body: "Enter your name, bodyweight, and sex to unlock personalised standards and the leaderboard. You can also manage your 1RMs here.",
    position: "top",
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function OnboardingTour() {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [isPending, startTransition] = useTransition();
  const [started, setStarted] = useState(false);
  const router = useRouter();

  const PAD = 6;

  const measureTarget = useCallback(() => {
    if (!started) return;
    const current = STEPS[step];
    const el = document.querySelector(`[data-tour="${current.target}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      setTargetRect({
        top: r.top - PAD,
        left: r.left - PAD,
        width: r.width + PAD * 2,
        height: r.height + PAD * 2,
      });
    } else {
      setTargetRect(null);
    }
  }, [step, started]);

  useEffect(() => {
    measureTarget();
    window.addEventListener("resize", measureTarget);
    window.addEventListener("scroll", measureTarget, true);
    return () => {
      window.removeEventListener("resize", measureTarget);
      window.removeEventListener("scroll", measureTarget, true);
    };
  }, [measureTarget]);

  function finish() {
    startTransition(async () => {
      await completeOnboarding();
      router.refresh();
    });
  }

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      finish();
    }
  }

  if (!started) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
        <div className="flex w-full max-w-sm flex-col items-center gap-6 bg-surface-container px-8 pb-8 pt-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center bg-[#cafd00]/20">
            <span
              className="material-symbols-outlined text-4xl text-[#cafd00]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              waving_hand
            </span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#cafd00]">
              YOUR TRAINING COMPANION
            </p>
            <h2 className="mt-2 font-headline text-2xl font-black uppercase tracking-tight text-on-surface">
              WELCOME TO THE YARD
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
              Let us show you around. We&apos;ll highlight the key areas so you know exactly where everything is.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <button
              onClick={() => setStarted(true)}
              className="squishy w-full bg-[#cafd00] py-3.5 font-headline text-sm font-black uppercase tracking-widest text-black transition-transform duration-150 active:scale-95"
            >
              TAKE THE TOUR
            </button>
            <button
              onClick={finish}
              disabled={isPending}
              className="py-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant transition-colors hover:text-on-surface disabled:opacity-50"
            >
              SKIP — I&apos;LL FIGURE IT OUT
            </button>
          </div>
        </div>
      </div>
    );
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const tooltipStyle: React.CSSProperties = {};
  if (targetRect) {
    if (current.position === "bottom") {
      tooltipStyle.top = targetRect.top + targetRect.height + 12;
      tooltipStyle.left = 16;
      tooltipStyle.right = 16;
    } else {
      tooltipStyle.bottom = window.innerHeight - targetRect.top + 12;
      tooltipStyle.left = 16;
      tooltipStyle.right = 16;
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop with cutout */}
      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx="4"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.75)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Highlight border */}
      {targetRect && (
        <div
          className="absolute rounded border-2 border-[#cafd00] transition-all duration-300"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute z-10 flex flex-col gap-3 bg-surface-container-high p-5 shadow-2xl transition-all duration-300"
        style={tooltipStyle}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-headline text-sm font-black uppercase tracking-tight text-[#cafd00]">
              {current.title}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
              {current.body}
            </p>
          </div>
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-outline">
            {step + 1}/{STEPS.length}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={finish}
            disabled={isPending}
            className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface disabled:opacity-50"
          >
            SKIP
          </button>
          <button
            onClick={handleNext}
            disabled={isPending}
            className="squishy bg-[#cafd00] px-5 py-2 font-headline text-xs font-black uppercase tracking-widest text-black transition-transform duration-150 disabled:opacity-50 active:scale-95"
          >
            {isPending ? "..." : isLast ? "DONE" : "NEXT"}
          </button>
        </div>
      </div>
    </div>
  );
}
