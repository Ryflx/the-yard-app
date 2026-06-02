/**
 * Level → start-week assessment engine.
 *
 * For skill-PROGRESSION courses we ask one question to determine which week
 * of the drill sequence a user should begin at.  Mobility/conditioning/engine
 * courses always start at week 1 (no assessment).
 */

export interface SkillAssessmentOption {
  id: string;
  label: string;
  startWeek: number;
  /** If set, wizard may suggest switching to this course instead. */
  suggestCourseSlug?: string;
}

export interface SkillAssessment {
  courseSlug: string;
  question: string;
  options: SkillAssessmentOption[];
}

export const SKILL_ASSESSMENTS: SkillAssessment[] = [
  {
    courseSlug: "double-under-foundations",
    question: "How many double-unders can you string together unbroken?",
    options: [
      { id: "none", label: "Can't do any yet", startWeek: 1 },
      { id: "1-5", label: "1–5 in a row", startWeek: 1 },
      { id: "6-20", label: "6–20 in a row", startWeek: 2 },
      { id: "21-50", label: "21–50 in a row", startWeek: 3 },
      { id: "50plus", label: "50+ unbroken", startWeek: 3, suggestCourseSlug: "double-under-pro" },
    ],
  },
  {
    courseSlug: "double-under-pro",
    question: "Unbroken double-unders?",
    options: [
      { id: "under50", label: "Under 50 unbroken", startWeek: 1 },
      { id: "50-100", label: "50–100 unbroken", startWeek: 2 },
      { id: "100plus", label: "100+ unbroken", startWeek: 3 },
    ],
  },
  {
    courseSlug: "kipping-pull-up-performance",
    question: "Unbroken kipping pull-ups?",
    options: [
      { id: "none", label: "Can't kip yet", startWeek: 1 },
      { id: "1-5", label: "1–5 unbroken", startWeek: 2 },
      { id: "6-15", label: "6–15 unbroken", startWeek: 3 },
      { id: "15plus", label: "15+ unbroken", startWeek: 4 },
    ],
  },
  {
    courseSlug: "strict-pull-up-strength",
    question: "Strict pull-ups (no band)?",
    options: [
      { id: "none", label: "0 — still building", startWeek: 1 },
      { id: "1-3", label: "1–3 reps", startWeek: 2 },
      { id: "4-8", label: "4–8 reps", startWeek: 3 },
      { id: "8plus", label: "8+ reps", startWeek: 4 },
    ],
  },
  {
    courseSlug: "toes-to-bar-transformed",
    question: "Unbroken toes-to-bar?",
    options: [
      { id: "none", label: "Can't do one yet", startWeek: 1 },
      { id: "1-5", label: "1–5 unbroken", startWeek: 2 },
      { id: "6-15", label: "6–15 unbroken", startWeek: 3 },
      { id: "15plus", label: "15+ unbroken", startWeek: 4 },
    ],
  },
  {
    courseSlug: "bar-muscle-up-mastery",
    question: "Bar muscle-ups?",
    options: [
      { id: "none", label: "Not yet", startWeek: 1 },
      { id: "1-2", label: "1–2 reps", startWeek: 2 },
      { id: "3plus", label: "3+ reps", startWeek: 3 },
    ],
  },
  {
    courseSlug: "muscle-up-madness",
    question: "Ring muscle-ups?",
    options: [
      { id: "none", label: "Not yet", startWeek: 1 },
      { id: "1-2", label: "1–2 reps", startWeek: 2 },
      { id: "3plus", label: "3+ reps", startWeek: 3 },
    ],
  },
  {
    courseSlug: "handstand-push-up-power",
    question: "Strict HSPU?",
    options: [
      { id: "none", label: "Can't do one yet", startWeek: 1 },
      { id: "1-5", label: "1–5 reps", startWeek: 2 },
      { id: "5plus", label: "5+ reps", startWeek: 3 },
    ],
  },
  {
    courseSlug: "handstand-walk-hero",
    question: "Freestanding handstand?",
    options: [
      { id: "none", label: "Can't hold yet", startWeek: 1 },
      { id: "few-sec", label: "Hold for a few seconds", startWeek: 2 },
      { id: "walk-5plus", label: "Walk 5+ steps", startWeek: 3 },
    ],
  },
  {
    courseSlug: "rapid-rope-climbs",
    question: "Rope climbs?",
    options: [
      { id: "none", label: "None yet", startWeek: 1 },
      { id: "with-legs", label: "With legs", startWeek: 2 },
      { id: "legless", label: "Legless", startWeek: 3 },
    ],
  },
  {
    courseSlug: "confident-kick-ups",
    question: "Kick up to a wall handstand?",
    options: [
      { id: "no", label: "No — not there yet", startWeek: 1 },
      { id: "sometimes", label: "Sometimes / inconsistently", startWeek: 2 },
      { id: "consistently", label: "Consistently, every rep", startWeek: 3 },
    ],
  },
  {
    courseSlug: "butterfly-pull-up-breakthrough",
    question: "Butterfly pull-ups?",
    options: [
      { id: "none", label: "None yet", startWeek: 1 },
      { id: "few", label: "A few — rhythm is rough", startWeek: 2 },
      { id: "10plus", label: "10+ unbroken", startWeek: 3 },
    ],
  },
];

/** Answers keyed by courseId (number). Value is an option id string. */
export type LevelAnswers = Record<number, string>;

/**
 * Compute the 1-based start week for each selected course, clamped to
 * [1, max(1, totalWeeks - 1)].  Courses without an assessment default to 1.
 */
export function computeStartWeeks(
  courses: { id: number; slug: string; totalWeeks: number }[],
  levelAnswers: LevelAnswers,
): Record<number, number> {
  const bySlug = new Map(SKILL_ASSESSMENTS.map((a) => [a.courseSlug, a]));
  const result: Record<number, number> = {};
  for (const course of courses) {
    const assessment = bySlug.get(course.slug);
    const answer = levelAnswers[course.id];
    let startWeek = 1;
    if (assessment && answer) {
      const opt = assessment.options.find((o) => o.id === answer);
      if (opt) startWeek = opt.startWeek;
    }
    const maxStart = Math.max(1, course.totalWeeks - 1);
    result[course.id] = Math.min(startWeek, maxStart);
  }
  return result;
}

/**
 * Return the subset of courses that have an assessment, shaped for the wizard.
 */
export function getAssessmentsForCourses(
  courses: { id: number; slug: string; name?: string }[],
): { courseId: number; courseName?: string; question: string; options: SkillAssessmentOption[] }[] {
  const bySlug = new Map(SKILL_ASSESSMENTS.map((a) => [a.courseSlug, a]));
  const out: { courseId: number; courseName?: string; question: string; options: SkillAssessmentOption[] }[] = [];
  for (const course of courses) {
    const assessment = bySlug.get(course.slug);
    if (!assessment) continue;
    out.push({
      courseId: course.id,
      courseName: course.name,
      question: assessment.question,
      options: assessment.options,
    });
  }
  return out;
}
