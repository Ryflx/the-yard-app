export function parseSetsAndReps(sets: string | null | undefined): { setCount?: number; repsPerSet?: number } {
  if (!sets) return {};
  // "3-3-3-3-3" → 5 sets of 3
  const dashMatch = sets.match(/^(\d+)(?:\s*-\s*\d+)+$/);
  if (dashMatch) {
    const parts = sets.split(/\s*-\s*/);
    return { setCount: parts.length, repsPerSet: parseInt(parts[0]) };
  }
  // "Every 2:00 x 10 rounds" / "Every 3:00 x 10" → 10 sets
  // Must precede the generic "Nx M" matcher, which would otherwise grab "00 x 10".
  const intervalMatch = sets.match(/every\s+\d+:\d+\s*x\s*(\d+)/i);
  if (intervalMatch) {
    return { setCount: parseInt(intervalMatch[1]) };
  }
  // "EMOM 5" → 5 sets
  const emomMatch = sets.match(/^\s*emom\s+(\d+)/i);
  if (emomMatch) {
    return { setCount: parseInt(emomMatch[1]) };
  }
  // "5 sets" or "5x3"
  const setsMatch = sets.match(/(\d+)\s*(?:sets?|x)\s*(\d+)?/i);
  if (setsMatch) {
    return {
      setCount: parseInt(setsMatch[1]),
      repsPerSet: setsMatch[2] ? parseInt(setsMatch[2]) : undefined,
    };
  }
  return {};
}
