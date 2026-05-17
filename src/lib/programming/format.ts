/**
 * Strip WODprep course-internal shorthand from drill/workout titles.
 *
 * Examples:
 *   "KPUP 1.2 (Week 1, Workout 2)" → "Week 1 · Workout 2"
 *   "Kipping Pull-up Performance — KPUP 1.2 (Week 1, Workout 2)"
 *     → "Kipping Pull-up Performance — Week 1 · Workout 2"
 *
 * Titles without the shorthand pass through unchanged.
 */
export function formatDrillTitle(rawTitle: string): string {
  return rawTitle.replace(
    /\b[A-Z]+\s*\d+(?:\.\d+)?\s*\((Week\s+\d+)\s*,\s*(Workout\s+\d+)\)/gi,
    "$1 · $2",
  );
}
