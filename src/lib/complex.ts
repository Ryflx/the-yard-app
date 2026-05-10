/**
 * complex.ts — Olympic-lifting complex analyser
 *
 * Given a complex liftName (e.g. "snatch pull + hang snatch + OHS") and the
 * user's stored 1RMs, produces a synthetic 1RM ("syntheticMax") that the
 * existing percentage pipeline (calculateWeight in percentage.ts) can use to
 * get a sensible prescribed weight.
 *
 * syntheticMax contract (when NO prescribedPercentage is supplied):
 *   syntheticMax = round_to_half(base1RM × shapePenaltyMultiplier)
 *   A caller can apply its own % to syntheticMax and get the right answer
 *   because shape penalties are already baked in.
 *
 * When prescribedPercentage IS supplied:
 *   syntheticMax = base1RM   (clean base; percentage pipeline applies coach's %)
 *   finalWeight  = round_to_half(base1RM × prescribedPercentage / 100)
 *   Shape penalties are NOT applied — coach's prescription supersedes them.
 *
 * C&J SPECIAL CASE:
 *   "clean and jerk", "clean & jerk", and "C&J" are a SINGLE recorded lift;
 *   they do NOT contain a "+" delimiter, so isComplex() returns false and
 *   computeComplex() short-circuits to null. The caller should look up the
 *   user's Clean & Jerk 1RM directly using normalizeLiftName() from
 *   percentage.ts (which maps all aliases → "squat clean + split jerk").
 *   Writing the compound with a literal "+" (e.g. "clean + jerk") WILL be
 *   parsed as a complex — coaches should avoid this form for C&J singles.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ComponentCategory =
  | "press_in_snatch"
  | "snatch_balance"
  | "sots"
  | "snatch"
  | "hang_snatch"
  | "power_snatch"
  | "clean"
  | "hang_clean"
  | "power_clean"
  | "jerk"
  | "split_jerk"
  | "push_jerk"
  | "push_press"
  | "ohs"
  | "front_squat"
  | "back_squat"
  | "snatch_pull"
  | "clean_pull"
  | "deadlift"
  | "tempo_pause" // marker, not a separate lift
  | "unknown";

export interface ComplexComponent {
  raw: string; // original token, e.g. "hang snatch"
  canonical: string; // normalised, e.g. "hang snatch"
  category: ComponentCategory;
  reps?: number; // if explicitly stated, e.g. "2 hang snatch"
}

export interface ComplexCalcInput {
  liftName: string;
  /** Map of canonical-ish lift names → 1RM (kg). Keys are normalised internally. */
  userMaxes: Record<string, number>;
  /** Total reps PER SET in the complex. Caller computes from program "2+1+2" → 5. */
  totalRepsPerSet: number;
  /** Optional: program-specified percentage. If supplied, applied directly to base1RM. */
  prescribedPercentage?: number;
  /** Optional: user is a beginner (sub-2× BW C&J). Subtracts 7% flat from effective %. */
  isBeginner?: boolean;
}

export interface ComplexCalcResult {
  components: ComplexComponent[];
  limitingLift: ComplexComponent;
  base1RM: number; // limiting lift's effective 1RM (after parent derivation)
  derivedFromParent: boolean; // true if we derived (e.g. hang snatch from snatch)
  appliedShapePenalties: string[]; // e.g. ["hang_variant: 0.95"]
  shapePenaltyMultiplier: number; // product of penalties, 1.0 if none
  baseIntensityPercent: number; // 80 / 75 / 70 / 65 / 60 etc.
  finalWeight: number; // suggested weight in kg, rounded to 0.5
  syntheticMax: number; // see module-level syntheticMax contract
}

// ---------------------------------------------------------------------------
// Category priority (index 0 = most limiting)
// ---------------------------------------------------------------------------

const CATEGORY_PRIORITY: ComponentCategory[] = [
  "press_in_snatch",
  "sots",
  "snatch_balance",
  "hang_snatch",
  "power_snatch",
  "snatch",
  "hang_clean",
  "power_clean",
  "clean",
  "push_press",
  "push_jerk",
  "split_jerk",
  "jerk",
  "ohs",
  "front_squat",
  "back_squat",
  "snatch_pull",
  "clean_pull",
  "deadlift",
  "tempo_pause",
  "unknown",
];

// ---------------------------------------------------------------------------
// Canonical name → category table
// ---------------------------------------------------------------------------

const CANONICAL_TABLE: Array<{ patterns: RegExp[]; category: ComponentCategory; canonical: string }> = [
  // Most limiting first so more-specific patterns match before generic ones
  {
    patterns: [/^press in snatch$/, /^press-in-snatch$/],
    category: "press_in_snatch",
    canonical: "press in snatch",
  },
  {
    patterns: [/^sots press$/, /^sots$/],
    category: "sots",
    canonical: "sots press",
  },
  {
    patterns: [/^snatch balance$/],
    category: "snatch_balance",
    canonical: "snatch balance",
  },
  // hang variants before plain to avoid "hang snatch" matching "snatch"
  {
    patterns: [/^hang snatch$/, /^hang squat snatch$/, /^hang squat snatches$/, /^hang snatches$/],
    category: "hang_snatch",
    canonical: "hang snatch",
  },
  {
    patterns: [/^hang power snatch$/],
    category: "hang_snatch",
    canonical: "hang snatch",
  },
  {
    patterns: [/^power snatch$/],
    category: "power_snatch",
    canonical: "power snatch",
  },
  {
    patterns: [/^snatch pull$/, /^snatch high pull$/],
    category: "snatch_pull",
    canonical: "snatch pull",
  },
  {
    patterns: [/^snatch$/, /^squat snatch$/, /^full snatch$/],
    category: "snatch",
    canonical: "snatch",
  },
  // Clean family
  {
    patterns: [/^hang clean$/, /^hang squat clean$/],
    category: "hang_clean",
    canonical: "hang clean",
  },
  {
    patterns: [/^hang power clean$/],
    category: "hang_clean",
    canonical: "hang clean",
  },
  {
    patterns: [/^power clean$/],
    category: "power_clean",
    canonical: "power clean",
  },
  {
    patterns: [/^clean pull$/, /^clean high pull$/],
    category: "clean_pull",
    canonical: "clean pull",
  },
  {
    patterns: [/^clean$/, /^squat clean$/, /^full clean$/],
    category: "clean",
    canonical: "clean",
  },
  // Jerk family
  {
    patterns: [/^push press$/],
    category: "push_press",
    canonical: "push press",
  },
  {
    patterns: [/^push jerk$/],
    category: "push_jerk",
    canonical: "push jerk",
  },
  {
    patterns: [/^split jerk$/],
    category: "split_jerk",
    canonical: "split jerk",
  },
  {
    patterns: [/^jerk$/],
    category: "jerk",
    canonical: "jerk",
  },
  // Squat family
  {
    patterns: [/^ohs$/, /^overhead squat$/],
    category: "ohs",
    canonical: "ohs",
  },
  {
    patterns: [/^front squat$/],
    category: "front_squat",
    canonical: "front squat",
  },
  {
    patterns: [/^back squat$/],
    category: "back_squat",
    canonical: "back squat",
  },
  // Pulls
  {
    patterns: [/^deadlift$/, /^sumo deadlift$/, /^conventional deadlift$/],
    category: "deadlift",
    canonical: "deadlift",
  },
  // Tempo/pause — marker only
  {
    patterns: [/^tempo$/, /^pause$/],
    category: "tempo_pause",
    canonical: "tempo",
  },
];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Strip rep prefixes like "2 " or "2x " or "1x " from a token. */
function stripRepPrefix(token: string): { reps: number | undefined; stripped: string } {
  // Matches "2 hang snatch" or "2x hang snatch" or "1x snatch"
  const match = token.match(/^(\d+)x?\s+(.+)$/);
  if (match) {
    return { reps: parseInt(match[1], 10), stripped: match[2] };
  }
  return { reps: undefined, stripped: token };
}

/** Categorise a normalised token string. */
function categoriseToken(normalised: string): { category: ComponentCategory; canonical: string } {
  // Handle tempo/pause prefix modifying another lift
  // e.g. "tempo snatch" → we record snatch category but note tempo modifier
  // For simplicity: treat "tempo X" as snatch/clean/etc. category (the main lift)
  // and separately flag tempo_pause as an additional component if needed.
  // The spec says tempo is a marker — we handle it in penalty logic via the full components list.

  for (const entry of CANONICAL_TABLE) {
    for (const pattern of entry.patterns) {
      if (pattern.test(normalised)) {
        return { category: entry.category, canonical: entry.canonical };
      }
    }
  }

  // Try stripping a tempo/pause prefix and re-matching the remainder
  const tempoMatch = normalised.match(/^(?:tempo|pause)\s+(.+)$/);
  if (tempoMatch) {
    const inner = tempoMatch[1];
    for (const entry of CANONICAL_TABLE) {
      for (const pattern of entry.patterns) {
        if (pattern.test(inner)) {
          // Return the inner lift's category; caller will add tempo_pause component separately
          return { category: entry.category, canonical: `tempo ${inner}` };
        }
      }
    }
  }

  return { category: "unknown", canonical: normalised };
}

/** Round to nearest 0.5 kg — same formula as calculateWeight in percentage.ts */
function roundToHalf(w: number): number {
  return Math.round(w * 2) / 2;
}

/** Lower-case a key for userMaxes lookup. */
function normaliseMaxKey(key: string): string {
  return key.toLowerCase().trim();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns true if the liftName represents a complex (contains a "+" delimiter
 * joining multiple distinct lifts). Also accepts "→", "to", "into" as delimiters.
 *
 * Does NOT match "split jerk", "front squat" etc. which are single-word lifts.
 * See module-level comment for the C&J special case.
 */
export function isComplex(liftName: string): boolean {
  const lower = liftName.toLowerCase().trim();

  // Explicit "+" is the primary indicator
  if (lower.includes("+")) return true;

  // Arrow delimiter
  if (lower.includes("→")) return true;

  // Word-based delimiters: "to" / "into" between two lift names
  // Must be surrounded by word characters to avoid matching "front squat"
  if (/\s+(?:into|to)\s+/i.test(lower)) return true;

  return false;
}

/**
 * Parse a complex liftName into individual components.
 * Supports "+", "→", "to", "into" as delimiters.
 * Strips leading rep counts ("2 hang snatch", "1x snatch").
 * Tempo/pause prefixes produce both the modified lift AND a tempo_pause marker
 * inserted immediately after.
 */
export function parseComplex(liftName: string): ComplexComponent[] {
  // Normalise delimiters → all become "|" for easy splitting
  const normalised = liftName
    .replace(/→/g, "|")
    .replace(/\s+(?:into|to)\s+/gi, "|")
    .replace(/\+/g, "|");

  const tokens = normalised
    .split("|")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const components: ComplexComponent[] = [];

  for (const token of tokens) {
    const lower = token.toLowerCase();
    const { reps, stripped } = stripRepPrefix(lower);
    const { category, canonical } = categoriseToken(stripped);

    components.push({
      raw: token,
      canonical,
      category,
      reps,
    });

    // If the token had a tempo/pause prefix, insert a tempo_pause marker after
    if (/^(?:tempo|pause)\s+/i.test(stripped)) {
      components.push({
        raw: "tempo",
        canonical: "tempo",
        category: "tempo_pause",
        reps: undefined,
      });
    } else if (/^(?:tempo|pause)\s+/.test(lower) && category !== "tempo_pause") {
      // Handled by the categoriseToken tempo-prefix branch
      components.push({
        raw: "tempo",
        canonical: "tempo",
        category: "tempo_pause",
        reps: undefined,
      });
    }
  }

  return components;
}

/**
 * Pick the most limiting (weakest) lift from the components list.
 * Priority is defined by CATEGORY_PRIORITY (index 0 = most limiting).
 * Unknown and tempo_pause categories are skipped when selecting.
 */
export function pickLimitingLift(components: ComplexComponent[]): ComplexComponent {
  // Filter out pure markers
  const scorable = components.filter(
    (c) => c.category !== "tempo_pause" && c.category !== "unknown"
  );

  if (scorable.length === 0) {
    // Fall back to first component
    return components[0];
  }

  // Return the component with the lowest priority index (= most limiting)
  return scorable.reduce((best, current) => {
    const bestIdx = CATEGORY_PRIORITY.indexOf(best.category);
    const currIdx = CATEGORY_PRIORITY.indexOf(current.category);
    return currIdx < bestIdx ? current : best;
  });
}

/**
 * Derive the effective base 1RM for the limiting lift.
 *
 * Checks userMaxes first (direct hit beats derivation). Falls back to deriving
 * from a parent lift using fixed ratios.
 *
 * Returns null if neither a direct nor parent 1RM is available.
 *
 * Pure pull edge case:
 *   If the limiting lift is snatch_pull and no snatch 1RM is available, we cap
 *   at 1.05 × snatch. If it's clean_pull, cap at 1.05 × clean. This reflects
 *   the fact that pulls are typically done ABOVE the catch max.
 */
export function deriveBase1RM(
  limiting: ComplexComponent,
  userMaxes: Record<string, number>
): { base1RM: number; derivedFromParent: boolean } | null {
  // Normalised lookup helper
  const getMax = (key: string): number | undefined => {
    const k = normaliseMaxKey(key);
    // Direct key match
    if (userMaxes[k] !== undefined) return userMaxes[k];
    // Also try the raw key (in case caller stored with original casing)
    for (const [mk, mv] of Object.entries(userMaxes)) {
      if (normaliseMaxKey(mk) === k) return mv;
    }
    return undefined;
  };

  // 1) Direct hit — if the user has a 1RM for exactly this lift, use it.
  const direct = getMax(limiting.canonical);
  if (direct !== undefined) {
    return { base1RM: direct, derivedFromParent: false };
  }

  // 2) Derivation rules — derive from parent lift if no direct 1RM
  const parentAndRatio = getParentAndRatio(limiting.category);
  if (!parentAndRatio) return null;

  const { parents, ratio } = parentAndRatio;
  for (const parentKey of parents) {
    const parentMax = getMax(parentKey);
    if (parentMax !== undefined) {
      return {
        base1RM: parentMax * ratio,
        derivedFromParent: true,
      };
    }
  }

  return null;
}

/** Maps each derivable category to its parent lift keys and derivation ratio. */
function getParentAndRatio(
  category: ComponentCategory
): { parents: string[]; ratio: number } | null {
  switch (category) {
    case "hang_snatch":
      return { parents: ["snatch", "squat snatch", "full snatch"], ratio: 0.9 };
    case "power_snatch":
      return { parents: ["snatch", "squat snatch", "full snatch"], ratio: 0.8 };
    case "snatch_balance":
      return { parents: ["snatch", "squat snatch", "full snatch"], ratio: 1.0 };
    case "sots":
      return { parents: ["snatch", "squat snatch", "full snatch"], ratio: 0.55 };
    case "press_in_snatch":
      return { parents: ["snatch", "squat snatch", "full snatch"], ratio: 0.5 };
    case "hang_clean":
      return { parents: ["clean", "squat clean", "full clean"], ratio: 0.9 };
    case "power_clean":
      return { parents: ["clean", "squat clean", "full clean"], ratio: 0.8 };
    case "push_press":
      return { parents: ["jerk", "split jerk", "push jerk"], ratio: 0.85 };
    case "push_jerk":
      return { parents: ["jerk", "split jerk"], ratio: 0.95 };
    case "split_jerk":
      // Treat split as jerk if no jerk 1RM
      return { parents: ["jerk"], ratio: 1.0 };
    case "snatch_pull":
      // Pure pull edge case handled in computeComplex — here cap at 1.05 × snatch
      return { parents: ["snatch", "squat snatch"], ratio: 1.05 };
    case "clean_pull":
      return { parents: ["clean", "squat clean"], ratio: 1.05 };
    default:
      return null;
  }
}

/**
 * Determine whether the components form a "pure pull complex" —
 * i.e. no catch lifts (snatch family or clean family) are present,
 * only pulls and/or squats.
 */
function isPurePullComplex(components: ComplexComponent[]): boolean {
  const CATCH_CATEGORIES = new Set<ComponentCategory>([
    "press_in_snatch",
    "sots",
    "snatch_balance",
    "snatch",
    "hang_snatch",
    "power_snatch",
    "clean",
    "hang_clean",
    "power_clean",
    "jerk",
    "split_jerk",
    "push_jerk",
  ]);
  const PULL_CATEGORIES = new Set<ComponentCategory>([
    "snatch_pull",
    "clean_pull",
    "deadlift",
  ]);

  const hasCatch = components.some((c) => CATCH_CATEGORIES.has(c.category));
  const hasPull = components.some((c) => PULL_CATEGORIES.has(c.category));

  return !hasCatch && hasPull;
}

/** Rep-bucket → base intensity percent */
function repBucketPercent(totalReps: number): number {
  if (totalReps <= 2) return 80;
  if (totalReps === 3) return 75;
  if (totalReps === 4) return 70;
  if (totalReps === 5) return 65;
  return 60; // 6+
}

/**
 * Main entry point. Returns null if:
 *  - liftName is not a complex (no "+" or equivalent delimiter)
 *  - no base 1RM can be derived (missing user maxes)
 */
export function computeComplex(input: ComplexCalcInput): ComplexCalcResult | null {
  const { liftName, userMaxes, totalRepsPerSet, prescribedPercentage, isBeginner } = input;

  // Short-circuit: not a complex
  if (!isComplex(liftName)) return null;

  const components = parseComplex(liftName);
  const limiting = pickLimitingLift(components);

  // Derive base 1RM
  const derivationResult = deriveBase1RM(limiting, userMaxes);
  if (!derivationResult) return null;

  const { base1RM, derivedFromParent } = derivationResult;

  // -------------------------------------------------------------------------
  // Shape penalties
  // -------------------------------------------------------------------------
  const appliedShapePenalties: string[] = [];
  let shapePenaltyMultiplier = 1.0;

  const applyPenalty = (label: string, factor: number) => {
    appliedShapePenalties.push(`${label}: ${factor}`);
    shapePenaltyMultiplier *= factor;
  };

  const categories = new Set(components.map((c) => c.category));
  const hangCategories: ComponentCategory[] = ["hang_snatch", "hang_clean"];
  const hasHang = hangCategories.some((cat) => categories.has(cat));

  if (hasHang) applyPenalty("hang_variant", 0.95);

  const extremeCategories: ComponentCategory[] = ["sots", "press_in_snatch"];
  const hasExtreme = extremeCategories.some((cat) => categories.has(cat));
  if (hasExtreme) applyPenalty("sots_or_press_in_snatch", 0.85);

  const hasOHS = categories.has("ohs");
  if (hasOHS && totalRepsPerSet >= 4) applyPenalty("ohs_extra", 0.95);

  const hasTempoOrPause = categories.has("tempo_pause");
  if (hasTempoOrPause) applyPenalty("tempo_pause", 0.92);

  // Pure pull — no additional shape penalty here (handled via base1RM cap above)
  // but we note the complex type
  const purePull = isPurePullComplex(components);

  // -------------------------------------------------------------------------
  // Base intensity percent
  // -------------------------------------------------------------------------
  let baseIntensityPercent: number;
  let finalWeight: number;
  let syntheticMax: number;

  if (prescribedPercentage !== undefined) {
    // Coach-prescribed: skip rep-bucket logic. Shape penalties NOT applied.
    // syntheticMax = base1RM so caller's % pipeline works cleanly.
    baseIntensityPercent = prescribedPercentage;

    let effectivePct = prescribedPercentage;
    if (isBeginner) effectivePct -= 7;

    finalWeight = roundToHalf(base1RM * (effectivePct / 100));
    syntheticMax = base1RM;

    // Reset shape penalties — coach has prescribed
    appliedShapePenalties.length = 0;
    shapePenaltyMultiplier = 1.0;
  } else {
    baseIntensityPercent = repBucketPercent(totalRepsPerSet);

    let effectivePct = baseIntensityPercent;
    if (isBeginner) effectivePct -= 7;

    finalWeight = roundToHalf(base1RM * (effectivePct / 100) * shapePenaltyMultiplier);
    // syntheticMax lets caller apply their own % and get the right answer.
    // It already has shape penalties baked in.
    syntheticMax = roundToHalf(base1RM * shapePenaltyMultiplier);
  }

  void purePull; // informational; base1RM already capped via getParentAndRatio

  return {
    components,
    limitingLift: limiting,
    base1RM,
    derivedFromParent,
    appliedShapePenalties,
    shapePenaltyMultiplier,
    baseIntensityPercent,
    finalWeight,
    syntheticMax,
  };
}
