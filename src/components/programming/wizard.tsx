"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPlan } from "@/app/actions";
import type { skillCourses, WeeklyDrillSlot } from "@/db/schema";
import type { WeaknessSignal } from "@/lib/programming/types";
import { StartingPointStep } from "./wizard-step-1-starting-point";
import { SkillsStep } from "./wizard-step-2-skills";
import { SlotsStep } from "./wizard-step-3-slots";
import { LevelStep } from "./wizard-step-4-level";
import { ReviewStep } from "./wizard-step-5-review";
import { SuccessStep } from "./wizard-step-success";
import { getAssessmentsForCourses } from "../../../data/skill-library/assessments";
import type { LevelAnswers } from "../../../data/skill-library/assessments";

type Course = typeof skillCourses.$inferSelect;

interface Props {
  initialSignals: WeaknessSignal[];
  courses: Course[];
}

export interface WizardState {
  // 1-5 are the input steps; 6 is the post-create success screen.
  // Step 4 (level) is skipped when none of the selected skills have an assessment.
  step: 1 | 2 | 3 | 4 | 5 | 6;
  wodsPerWeek: number;
  ropeConfidence: number;
  handstandConfidence: number;
  pullGymConfidence: number;
  selectedSkillIds: number[];
  slots: WeeklyDrillSlot[];
  levelAnswers: LevelAnswers;
  createdPlanId: number | null;
  createdSessionCount: number;
  createdUnplaceableCount: number;
}

const TOTAL_INPUT_STEPS = 5;

export function Wizard({ initialSignals, courses }: Props) {
  const [state, setState] = useState<WizardState>({
    step: 1,
    wodsPerWeek: 3,
    ropeConfidence: 3,
    handstandConfidence: 3,
    pullGymConfidence: 3,
    selectedSkillIds: initialSignals.slice(0, 3).map((s) => s.skillId),
    slots: [],
    levelAnswers: {},
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
          {
            wodsPerWeek: state.wodsPerWeek,
            ropeConfidence: state.ropeConfidence,
            handstandConfidence: state.handstandConfidence,
            pullGymConfidence: state.pullGymConfidence,
          },
          state.slots,
          state.selectedSkillIds,
          state.levelAnswers
        );
        setState((s) => ({
          ...s,
          step: 6,
          createdPlanId: result.planId,
          createdSessionCount: result.sessionCount,
          createdUnplaceableCount: result.unplaceableCount,
        }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create plan");
      }
    });
  }

  // Compute whether the level step has any questions (skip it if not)
  const selectedCourses = courses.filter((c) => state.selectedSkillIds.includes(c.id));
  const hasLevelAssessments =
    getAssessmentsForCourses(selectedCourses.map((c) => ({ id: c.id, slug: c.slug }))).length > 0;

  // When no selected skills have assessments, the effective step count is 4 not 5.
  const effectiveTotalSteps = hasLevelAssessments ? TOTAL_INPUT_STEPS : TOTAL_INPUT_STEPS - 1;

  // Display step number accounts for the skipped step
  function displayStep(rawStep: number): number {
    if (!hasLevelAssessments && rawStep === 5) return 4;
    return rawStep;
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
            {Array.from({ length: effectiveTotalSteps }).map((_, i) => {
              const stepNum = i + 1;
              const currentDisplay = displayStep(state.step);
              const isActive = stepNum === currentDisplay;
              const isDone = stepNum < currentDisplay;
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
            Step {displayStep(state.step)} of {effectiveTotalSteps}
          </p>
        </>
      )}

      <div className="mt-6">
        {state.step === 1 && (
          <StartingPointStep
            state={state}
            onChange={set}
            onNext={() => setState((s) => ({ ...s, step: 2 }))}
          />
        )}
        {/* Step 2 is now Slots (file wizard-step-3-slots.tsx) */}
        {state.step === 2 && (
          <SlotsStep
            state={state}
            onChange={set}
            onBack={() => setState((s) => ({ ...s, step: 1 }))}
            onNext={() => setState((s) => ({ ...s, step: 3 }))}
          />
        )}
        {/* Step 3 is Skills (file wizard-step-2-skills.tsx) */}
        {state.step === 3 && (
          <SkillsStep
            state={state}
            courses={courses}
            onChange={set}
            onBack={() => setState((s) => ({ ...s, step: 2 }))}
            onNext={() => {
              // Skip the level step if no selected skills have an assessment
              const sel = courses.filter((c) => state.selectedSkillIds.includes(c.id));
              const hasAssessments =
                getAssessmentsForCourses(sel.map((c) => ({ id: c.id, slug: c.slug }))).length > 0;
              setState((s) => ({ ...s, step: hasAssessments ? 4 : 5 }));
            }}
          />
        )}
        {/* Step 4 is Level/Calibration (file wizard-step-4-level.tsx) — may be skipped */}
        {state.step === 4 && (
          <LevelStep
            state={state}
            courses={courses}
            onChange={set}
            onBack={() => setState((s) => ({ ...s, step: 3 }))}
            onNext={() => setState((s) => ({ ...s, step: 5 }))}
          />
        )}
        {/* Step 5 is Review (file wizard-step-5-review.tsx) */}
        {state.step === 5 && (
          <ReviewStep
            state={state}
            courses={courses}
            onBack={() => {
              // Back from review goes to level if it was shown, otherwise skills
              setState((s) => ({ ...s, step: hasLevelAssessments ? 4 : 3 }));
            }}
            onCommit={commit}
            pending={pending}
          />
        )}
        {state.step === 6 && state.createdPlanId != null && (
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
