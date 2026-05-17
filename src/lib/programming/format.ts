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

/**
 * Pull out MAX-rep test movements from drill sections (e.g.
 * "MAX unbroken Kipping Pull-up", "MAX Hollow Rocks").
 *
 * Returns deduped movement strings — the same test that recurs across weeks
 * (1.1, 4.3, 8.3) gives the user a comparable benchmark over time.
 */
export function extractMaxTests(
  sections: Array<{ name: string; items: Array<{ movement?: string }> }>,
): string[] {
  const tests = new Set<string>();
  for (const section of sections) {
    for (const item of section.items) {
      const m = item.movement?.trim() ?? "";
      // Movement line must start with MAX or contain MAX followed by a movement word.
      // Excludes "Rest walk 2 minutes" etc. that happen to share section context.
      if (!/^\s*MAX\b/i.test(m) && !/\bMAX\s+[A-Za-z]/.test(m)) continue;
      // Exclude meta lines that mention MAX but aren't a movement prescription
      if (/score\s*sheet|track\s+your|video|share/i.test(m)) continue;
      tests.add(m);
    }
  }
  return Array.from(tests);
}
