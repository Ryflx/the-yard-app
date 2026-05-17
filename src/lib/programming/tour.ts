import type { TourId } from "./types";

export function pickNextTour(seen: TourId[] | string[], onboardingComplete: boolean): TourId | null {
  if (!onboardingComplete) return "onboarding-v1";
  if (!seen.includes("custom-programming-v1")) return "custom-programming-v1";
  return null;
}

export function markTourSeenLocal(seen: TourId[] | string[], tourId: TourId): TourId[] {
  const out = new Set<TourId>(seen as TourId[]);
  out.add(tourId);
  // Brand-new users complete onboarding-v1 and shouldn't be re-prompted with the
  // custom-programming-v1 spotlight immediately after — the onboarding tour already
  // includes a step pointing at the CUSTOM tab.
  if (tourId === "onboarding-v1") out.add("custom-programming-v1");
  return Array.from(out);
}
