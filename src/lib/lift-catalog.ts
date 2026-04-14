/**
 * Canonical catalog of lifts users can track 1RMs and set goals against.
 * Grouped for UX (picker is organized by category).
 */

export interface LiftCatalogGroup {
  label: string;
  lifts: string[];
}

export const LIFT_CATALOG: LiftCatalogGroup[] = [
  {
    label: "Olympic Lifts",
    lifts: [
      "Snatch",
      "Clean & Jerk",
      "Clean",
      "Power Clean",
      "Hang Clean",
      "Hang Power Clean",
      "Hang Squat Clean",
      "Power Snatch",
      "Hang Snatch",
      "Hang Power Snatch",
      "Hang Squat Snatch",
      "Jerk",
      "Split Jerk",
      "Push Jerk",
      "Squat Clean + Split Jerk",
      "Power Clean + Hang Squat Clean",
      "Snatch Pull + Hang Squat Snatch",
      "Squat Snatch",
    ],
  },
  {
    label: "Squats",
    lifts: [
      "Back Squat",
      "Front Squat",
      "Overhead Squat",
      "Box Squat",
      "Pause Squat",
      "Tempo Back Squat",
      "Tempo Front Squat",
    ],
  },
  {
    label: "Presses",
    lifts: [
      "Bench Press",
      "Incline Bench Press",
      "Close Grip Bench Press",
      "Swiss Bar Bench Press",
      "Strict Press",
      "Push Press",
      "Floor Press",
      "Z Press",
    ],
  },
  {
    label: "Pulls",
    lifts: [
      "Deadlift",
      "Sumo Deadlift",
      "Romanian Deadlift",
      "Sumo RDL",
      "Tempo Sumo RDL",
      "Snatch Grip Deadlift",
      "Clean Pull",
      "Snatch Pull",
      "Clean High Pull",
      "Snatch High Pull",
      "Clean Pull + Hang Squat Clean",
    ],
  },
  {
    label: "Accessories",
    lifts: [
      "Pendlay Row",
      "Barbell Row",
      "Weighted Pull Up",
      "Weighted Chin Up",
      "Weighted Dip",
      "Good Morning",
      "Hip Thrust",
    ],
  },
];

export const ALL_CATALOG_LIFTS: string[] = LIFT_CATALOG.flatMap((g) => g.lifts);
