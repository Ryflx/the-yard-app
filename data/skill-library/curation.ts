import type { SkillCategory } from "@/db/schema";

export interface CurationEntry {
  category: SkillCategory;
  difficulty: 1 | 2 | 3 | 4 | 5;
  estimatedSessionMinutes: number;
  drillsPerWeek: number;
  prerequisiteSlug?: string;
}

export const CURATION: Record<string, CurationEntry> = {
  // Jump rope
  "double-under-foundations": { category: "jump_rope", difficulty: 1, estimatedSessionMinutes: 20, drillsPerWeek: 2 },
  "double-under-pro": { category: "jump_rope", difficulty: 3, estimatedSessionMinutes: 25, drillsPerWeek: 2, prerequisiteSlug: "double-under-foundations" },

  // Gymnastics pull
  "bar-muscle-up-mastery": { category: "gymnastics_pull", difficulty: 4, estimatedSessionMinutes: 40, drillsPerWeek: 1 },
  "muscle-up-madness": { category: "gymnastics_pull", difficulty: 4, estimatedSessionMinutes: 40, drillsPerWeek: 1 },
  "kipping-pull-up-performance": { category: "gymnastics_pull", difficulty: 2, estimatedSessionMinutes: 30, drillsPerWeek: 2 },
  "kickass-kip-swings": { category: "gymnastics_pull", difficulty: 2, estimatedSessionMinutes: 25, drillsPerWeek: 2 },
  "strict-pull-up-strength": { category: "gymnastics_pull", difficulty: 3, estimatedSessionMinutes: 30, drillsPerWeek: 2 },
  "butterfly-pull-up-breakthrough": { category: "gymnastics_pull", difficulty: 3, estimatedSessionMinutes: 30, drillsPerWeek: 1, prerequisiteSlug: "kipping-pull-up-performance" },
  "4-week-butterfly-ctb-pull-up-programming": { category: "gymnastics_pull", difficulty: 4, estimatedSessionMinutes: 35, drillsPerWeek: 1, prerequisiteSlug: "butterfly-pull-up-breakthrough" },
  "4-week-kipping-ctb-pull-up-programming": { category: "gymnastics_pull", difficulty: 3, estimatedSessionMinutes: 30, drillsPerWeek: 1, prerequisiteSlug: "kipping-pull-up-performance" },
  "rapid-rope-climbs": { category: "gymnastics_pull", difficulty: 3, estimatedSessionMinutes: 25, drillsPerWeek: 1 },
  "toes-to-bar-transformed": { category: "gymnastics_pull", difficulty: 2, estimatedSessionMinutes: 25, drillsPerWeek: 2 },

  // Handstand
  "handstand-walk-hero": { category: "handstand", difficulty: 4, estimatedSessionMinutes: 30, drillsPerWeek: 2 },
  "handstand-push-up-power": { category: "handstand", difficulty: 3, estimatedSessionMinutes: 30, drillsPerWeek: 2 },
  "confident-kick-ups": { category: "handstand", difficulty: 2, estimatedSessionMinutes: 20, drillsPerWeek: 2 },

  // Conditioning
  "endless-engine": { category: "conditioning", difficulty: 2, estimatedSessionMinutes: 45, drillsPerWeek: 2 },
  "endless-engine-running-only": { category: "conditioning", difficulty: 2, estimatedSessionMinutes: 45, drillsPerWeek: 2 },
  "endless-engine-specific-programming": { category: "conditioning", difficulty: 3, estimatedSessionMinutes: 45, drillsPerWeek: 2 },
  "burpee-blueprint": { category: "conditioning", difficulty: 1, estimatedSessionMinutes: 20, drillsPerWeek: 2 },

  // Mobility / accessory
  "happy-hips": { category: "mobility", difficulty: 1, estimatedSessionMinutes: 15, drillsPerWeek: 3 },
  "functional-core": { category: "mobility", difficulty: 1, estimatedSessionMinutes: 20, drillsPerWeek: 2 },
  "ankle-flexibility-solution": { category: "mobility", difficulty: 1, estimatedSessionMinutes: 15, drillsPerWeek: 3 },
  "shoulderrom-unlocked": { category: "mobility", difficulty: 1, estimatedSessionMinutes: 15, drillsPerWeek: 3 },
  "grip-strength-goals": { category: "mobility", difficulty: 2, estimatedSessionMinutes: 20, drillsPerWeek: 2 },
  "raw-strength": { category: "lifting", difficulty: 3, estimatedSessionMinutes: 45, drillsPerWeek: 2 },

  // Lifting
  "wodprep-weightlifting": { category: "weightlifting", difficulty: 3, estimatedSessionMinutes: 60, drillsPerWeek: 2 },
  "back-squat-strict-press": { category: "lifting", difficulty: 2, estimatedSessionMinutes: 45, drillsPerWeek: 2 },
};
