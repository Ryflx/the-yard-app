// Note: this file is the Level/Calibration step, rendered at Wizard step 4.
"use client";

import type { WizardState } from "./wizard";
import type { skillCourses } from "@/db/schema";
import { getAssessmentsForCourses } from "../../../data/skill-library/assessments";
import type { LevelAnswers } from "../../../data/skill-library/assessments";

type Course = typeof skillCourses.$inferSelect;

interface Props {
  state: WizardState;
  courses: Course[];
  onChange: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function LevelStep({ state, courses, onChange, onBack, onNext }: Props) {
  const selectedCourses = courses.filter((c) =>
    state.selectedSkillIds.includes(c.id)
  );

  const assessments = getAssessmentsForCourses(
    selectedCourses.map((c) => ({ id: c.id, slug: c.slug, name: c.name }))
  );

  // Build a courseId→name lookup from the full course list
  const courseNameById = new Map(courses.map((c) => [c.id, c.name]));

  const answeredCount = assessments.filter(
    (a) => state.levelAnswers[a.courseId] !== undefined
  ).length;
  const allAnswered = answeredCount === assessments.length;

  function pick(courseId: number, optionId: string) {
    const next: LevelAnswers = { ...state.levelAnswers, [courseId]: optionId };
    onChange("levelAnswers", next);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-black uppercase tracking-tight">
          HOW GOOD ARE YOU AT THESE?
        </h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          This sets where you start — no point grinding week 1 if you&apos;ve
          already got double-unders.
        </p>
      </div>

      <div className="space-y-5">
        {assessments.map((a) => {
          const name = courseNameById.get(a.courseId) ?? a.courseName ?? "Skill";
          const selected = state.levelAnswers[a.courseId];

          return (
            <div key={a.courseId} className="space-y-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  {name}
                </p>
                <p className="mt-0.5 text-sm font-medium text-on-surface">
                  {a.question}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                {a.options.map((opt) => {
                  const isSelected = selected === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => pick(a.courseId, opt.id)}
                      className={
                        "w-full border px-4 py-2.5 text-left text-sm font-medium transition-colors " +
                        (isSelected
                          ? "border-primary-container bg-primary-container text-on-primary-fixed"
                          : "border-outline-variant bg-surface-container text-on-surface hover:border-primary-container hover:bg-surface-container-high")
                      }
                    >
                      {opt.label}
                      {opt.suggestCourseSlug && isSelected && (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-70">
                          · consider the advanced course
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {!allAnswered && assessments.length > 0 && (
        <p className="text-xs text-on-surface-variant">
          {answeredCount}/{assessments.length} answered — unanswered skills
          start at week 1.
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={onBack}
          type="button"
          className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-on-surface-variant"
        >
          BACK
        </button>
        <button
          onClick={onNext}
          type="button"
          className="flex-[2] bg-primary-container py-3.5 font-headline text-sm font-black uppercase tracking-widest text-on-primary-fixed"
        >
          NEXT
        </button>
      </div>
    </div>
  );
}
