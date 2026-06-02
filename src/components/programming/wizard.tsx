"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPlan } from "@/app/actions";
import type { skillCourses, WeeklyDrillSlot } from "@/db/schema";
import type { WeaknessSignal } from "@/lib/programming/types";
import { SkillsStep } from "./wizard-step-2-skills";
import { SlotsStep } from "./wizard-step-3-slots";
import { ReviewStep } from "./wizard-step-5-review";
import { SuccessStep } from "./wizard-step-success";

type Course = typeof skillCourses.$inferSelect;

interface Props {
  initialSignals: WeaknessSignal[];
  courses: Course[];
}

export interface WizardState {
  // Step 1 = Skills, 2 = Slots, 3 = Review, 4 = Success (post-create screen)
  step: 1 | 2 | 3 | 4;
  selectedSkillIds: number[];
  slots: WeeklyDrillSlot[];
  createdPlanId: number | null;
  createdSessionCount: number;
  createdUnplaceableCount: number;
}

const TOTAL_INPUT_STEPS = 3;

export function Wizard({ initialSignals, courses }: Props) {
  const [state, setState] = useState<WizardState>({
    step: 1,
    selectedSkillIds: initialSignals.slice(0, 3).map((s) => s.skillId),
    slots: [],
    createdPlanId: null,
    createdSessionCount: 0,
    createdUnplaceableCount: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function set<K extends keyof WizardState>(k: K, v: WizardState[K]) {
    setState((s) => ({ ...s, [k]: v }));
  }

  function commit() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createPlan(
          {},
          state.slots,
          state.selectedSkillIds,
        );
        setState((s) => ({
          ...s,
          step: 4,
          createdPlanId: result.planId,
          createdSessionCount: result.sessionCount,
          createdUnplaceableCount: result.unplaceableCount,
        }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create plan");
      }
    });
  }

  const showProgress = state.step <= TOTAL_INPUT_STEPS;

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      {showProgress && (
        <>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary-container">
            BUILD YOUR PLAN
          </p>
          <p className="mt-2 text-sm text-on-surface-variant">
            A few quick questions, then we&apos;ll generate an 8-week skill plan and
            slot it into your schedule.
          </p>
          <div className="mt-4 flex gap-1.5">
            {Array.from({ length: TOTAL_INPUT_STEPS }).map((_, i) => {
              const stepNum = i + 1;
              const isActive = stepNum === state.step;
              const isDone = stepNum < state.step;
              return (
                <div
                  key={i}
                  className={
                    "h-1 flex-1 " +
                    (isActive || isDone ? "bg-primary-container" : "bg-surface-container-high")
                  }
                  aria-label={`Step ${stepNum} ${isDone ? "done" : isActive ? "current" : "upcoming"}`}
                />
              );
            })}
          </div>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.25em] text-on-surface-variant">
            Step {state.step} of {TOTAL_INPUT_STEPS}
          </p>
        </>
      )}

      <div className="mt-6">
        {/* Step 1: Skills */}
        {state.step === 1 && (
          <SkillsStep
            state={state}
            courses={courses}
            onChange={set}
            onBack={null}
            onNext={() => setState((s) => ({ ...s, step: 2 }))}
          />
        )}
        {/* Step 2: Slots */}
        {state.step === 2 && (
          <SlotsStep
            state={state}
            onChange={set}
            onBack={() => setState((s) => ({ ...s, step: 1 }))}
            onNext={() => setState((s) => ({ ...s, step: 3 }))}
          />
        )}
        {/* Step 3: Review */}
        {state.step === 3 && (
          <ReviewStep
            state={state}
            courses={courses}
            onBack={() => setState((s) => ({ ...s, step: 2 }))}
            onCommit={commit}
            pending={pending}
          />
        )}
        {/* Step 4: Success */}
        {state.step === 4 && state.createdPlanId != null && (
          <SuccessStep
            planId={state.createdPlanId}
            sessionCount={state.createdSessionCount}
            unplaceableCount={state.createdUnplaceableCount}
            onGoToSchedule={() => router.push("/schedule?class=CUSTOM")}
            onViewPlan={() => router.push(`/programming?planId=${state.createdPlanId}`)}
          />
        )}
      </div>
      {error && <p className="mt-4 text-xs text-red-400">{error}</p>}
    </div>
  );
}
