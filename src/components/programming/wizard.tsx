"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPlan } from "@/app/actions";
import type { skillCourses, WeeklyDrillSlot } from "@/db/schema";
import type { WeaknessSignal } from "@/lib/programming/types";
import { StartingPointStep } from "./wizard-step-1-starting-point";
import { SkillsStep } from "./wizard-step-2-skills";
import { SlotsStep } from "./wizard-step-3-slots";
import { LengthStep } from "./wizard-step-4-length";
import { ReviewStep } from "./wizard-step-5-review";

type Course = typeof skillCourses.$inferSelect;

interface Props {
  initialSignals: WeaknessSignal[];
  courses: Course[];
}

export interface WizardState {
  step: 1 | 2 | 3 | 4 | 5;
  wodsPerWeek: number;
  ropeConfidence: number;
  handstandConfidence: number;
  pullGymConfidence: number;
  selectedSkillIds: number[];
  slots: WeeklyDrillSlot[];
}

export function Wizard({ initialSignals, courses }: Props) {
  const [state, setState] = useState<WizardState>({
    step: 1,
    wodsPerWeek: 3,
    ropeConfidence: 3,
    handstandConfidence: 3,
    pullGymConfidence: 3,
    selectedSkillIds: initialSignals.slice(0, 3).map((s) => s.skillId),
    slots: [],
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
        const { planId } = await createPlan(
          {
            wodsPerWeek: state.wodsPerWeek,
            ropeConfidence: state.ropeConfidence,
            handstandConfidence: state.handstandConfidence,
            pullGymConfidence: state.pullGymConfidence,
          },
          state.slots,
          state.selectedSkillIds
        );
        router.push(`/programming?planId=${planId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create plan");
      }
    });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-on-surface-variant">
        STEP {state.step} OF 5
      </p>
      <div className="mt-4">
        {state.step === 1 && (
          <StartingPointStep
            state={state}
            onChange={set}
            onNext={() => setState((s) => ({ ...s, step: 2 }))}
          />
        )}
        {state.step === 2 && (
          <SkillsStep
            state={state}
            courses={courses}
            signals={initialSignals}
            onChange={set}
            onBack={() => setState((s) => ({ ...s, step: 1 }))}
            onNext={() => setState((s) => ({ ...s, step: 3 }))}
          />
        )}
        {state.step === 3 && (
          <SlotsStep
            state={state}
            onChange={set}
            onBack={() => setState((s) => ({ ...s, step: 2 }))}
            onNext={() => setState((s) => ({ ...s, step: 4 }))}
          />
        )}
        {state.step === 4 && (
          <LengthStep
            state={state}
            onBack={() => setState((s) => ({ ...s, step: 3 }))}
            onNext={() => setState((s) => ({ ...s, step: 5 }))}
          />
        )}
        {state.step === 5 && (
          <ReviewStep
            state={state}
            courses={courses}
            onBack={() => setState((s) => ({ ...s, step: 4 }))}
            onCommit={commit}
            pending={pending}
          />
        )}
      </div>
      {error && <p className="mt-4 text-xs text-red-400">{error}</p>}
    </div>
  );
}
