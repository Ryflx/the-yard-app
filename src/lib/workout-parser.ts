import type { SectionExercise, PercentageSet, WorkoutSectionType } from "@/db/schema";

interface ParsedSection {
  type: WorkoutSectionType;
  sets?: string;
  liftName?: string;
  exercises: SectionExercise[];
}

interface ParsedWorkout {
  title: string;
  date: string;
  sections: ParsedSection[];
}

const SECTION_HEADERS = [
  "WARM UP",
  "PRIMER",
  "OLYMPIC LIFT",
  "STRENGTH 1",
  "STRENGTH 2",
  "STRENGTH 3",
  "ACCESSORY",
  "COOL DOWN",
];

function parsePercentageLine(line: string): PercentageSet | null {
  const match = line.match(/^(\d+(?:x\d+)?)\s*@\s*(\d+)%$/i);
  if (match) {
    return { reps: match[1], percentage: parseInt(match[2]) };
  }
  return null;
}

export function parseWorkoutText(text: string, date: string): ParsedWorkout {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const title = lines[0] || "Workout";
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();

    const matchedHeader = SECTION_HEADERS.find(
      (h) => upperLine === h || upperLine.startsWith(h + ":")
    );

    if (matchedHeader) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        type: matchedHeader as WorkoutSectionType,
        exercises: [],
      };
      continue;
    }

    if (!currentSection) continue;

    if (/^\d+\s*sets?:?$/i.test(line)) {
      currentSection.sets = line;
      continue;
    }

    const percentageSet = parsePercentageLine(line);
    if (percentageSet) {
      const lastExercise =
        currentSection.exercises[currentSection.exercises.length - 1];
      if (lastExercise) {
        if (!lastExercise.percentageSets) lastExercise.percentageSets = [];
        lastExercise.percentageSets.push(percentageSet);
      }
      continue;
    }

    if (
      currentSection.type === "OLYMPIC LIFT" &&
      currentSection.exercises.length === 0
    ) {
      currentSection.liftName = line;
      currentSection.exercises.push({ name: line });
    } else {
      currentSection.exercises.push({ name: line });
    }
  }

  if (currentSection) sections.push(currentSection);

  return { title, date, sections };
}
