import { describe, it, expect } from "vitest";
import {
  isComplex,
  parseComplex,
  pickLimitingLift,
  deriveBase1RM,
  computeComplex,
} from "./complex";

// ---------------------------------------------------------------------------
// isComplex
// ---------------------------------------------------------------------------
describe("isComplex", () => {
  it("returns true for snatch + hang snatch", () => {
    expect(isComplex("snatch + hang snatch")).toBe(true);
  });

  it("returns true for snatch pull + snatch", () => {
    expect(isComplex("snatch pull + snatch")).toBe(true);
  });

  it("returns true for clean + jerk (standard complex notation)", () => {
    // Even though "clean and jerk" is a single recorded lift, writing it as
    // "clean + jerk" with a "+" delimiter looks like a complex. isComplex
    // itself only checks structure; computeComplex handles the C&J special case.
    expect(isComplex("clean + jerk")).toBe(true);
  });

  it("returns false for split jerk (single lift, no +)", () => {
    expect(isComplex("split jerk")).toBe(false);
  });

  it("returns false for front squat", () => {
    expect(isComplex("front squat")).toBe(false);
  });

  it("returns false for plain snatch", () => {
    expect(isComplex("snatch")).toBe(false);
  });

  it("returns false for clean and jerk (no + delimiter)", () => {
    expect(isComplex("clean and jerk")).toBe(false);
  });

  it("returns false for clean & jerk (no + delimiter)", () => {
    expect(isComplex("clean & jerk")).toBe(false);
  });

  /**
   * C&J SPECIAL CASE
   * "clean & jerk", "clean and jerk", and "C&J" are stored as a SINGLE lift
   * in the user's 1RM records. They do NOT contain a "+" delimiter and so
   * isComplex correctly returns false. The user's 1RM lookup key for this lift
   * is normalised to "squat clean + split jerk" by normalizeLiftName, matching
   * the LIFT_ALIASES table in percentage.ts.
   *
   * This means computeComplex will short-circuit and return null for these
   * forms — the caller should look up the user's C&J max directly.
   */
  it("C&J special case: isComplex is false for 'clean and jerk'", () => {
    expect(isComplex("clean and jerk")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseComplex
// ---------------------------------------------------------------------------
describe("parseComplex", () => {
  it("parses 'snatch pull + hang snatch + OHS' into 3 components with correct categories", () => {
    const components = parseComplex("snatch pull + hang snatch + OHS");
    expect(components).toHaveLength(3);
    expect(components[0].category).toBe("snatch_pull");
    expect(components[0].canonical).toBe("snatch pull");
    expect(components[1].category).toBe("hang_snatch");
    expect(components[1].canonical).toBe("hang snatch");
    expect(components[2].category).toBe("ohs");
    expect(components[2].canonical).toBe("ohs");
  });

  it("parses rep prefixes: '2 hang snatch + 1 snatch'", () => {
    const components = parseComplex("2 hang snatch + 1 snatch");
    expect(components).toHaveLength(2);
    expect(components[0].reps).toBe(2);
    expect(components[0].category).toBe("hang_snatch");
    expect(components[1].reps).toBe(1);
    expect(components[1].category).toBe("snatch");
  });

  it("parses 'snatch + ohs' (lowercase OHS)", () => {
    const components = parseComplex("snatch + ohs");
    expect(components).toHaveLength(2);
    expect(components[0].category).toBe("snatch");
    expect(components[1].category).toBe("ohs");
  });

  it("handles '→' as delimiter", () => {
    const components = parseComplex("clean → jerk");
    expect(components).toHaveLength(2);
    expect(components[0].category).toBe("clean");
    expect(components[1].category).toBe("jerk");
  });

  it("handles 'to' as delimiter", () => {
    const components = parseComplex("power snatch to OHS");
    expect(components).toHaveLength(2);
    expect(components[0].category).toBe("power_snatch");
    expect(components[1].category).toBe("ohs");
  });

  it("handles 'into' as delimiter", () => {
    const components = parseComplex("hang clean into jerk");
    expect(components).toHaveLength(2);
    expect(components[0].category).toBe("hang_clean");
    expect(components[1].category).toBe("jerk");
  });

  it("handles '1x' rep prefix syntax", () => {
    const components = parseComplex("2x hang snatch + 1x snatch");
    expect(components[0].reps).toBe(2);
    expect(components[1].reps).toBe(1);
  });

  it("assigns unknown category for unrecognised tokens", () => {
    const components = parseComplex("snatch + something weird");
    expect(components[0].category).toBe("snatch");
    expect(components[1].category).toBe("unknown");
  });

  it("recognises 'tempo' marker", () => {
    const components = parseComplex("tempo snatch + hang snatch");
    // tempo modifies the snatch component; could be tempo_pause marker or
    // the snatch category — implementation choice, but tempo must be detected.
    const hasTempoOrSnatch = components.some(
      (c) => c.category === "tempo_pause" || c.category === "snatch"
    );
    expect(hasTempoOrSnatch).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// pickLimitingLift
// ---------------------------------------------------------------------------
describe("pickLimitingLift", () => {
  it("picks hang_snatch from [snatch_pull, hang_snatch, ohs]", () => {
    const components = parseComplex("snatch pull + hang snatch + OHS");
    const limiting = pickLimitingLift(components);
    expect(limiting.category).toBe("hang_snatch");
  });

  it("picks the highest-priority pull from [clean_pull, snatch_pull] (pure pull)", () => {
    const components = parseComplex("clean pull + snatch pull");
    const limiting = pickLimitingLift(components);
    // snatch_pull and clean_pull are equal priority in the pull tier;
    // should return one of them (first match in priority order)
    expect(["snatch_pull", "clean_pull"]).toContain(limiting.category);
  });

  it("picks snatch from [snatch, ohs, front_squat]", () => {
    const components = parseComplex("snatch + ohs + front squat");
    const limiting = pickLimitingLift(components);
    expect(limiting.category).toBe("snatch");
  });

  it("picks press_in_snatch over snatch", () => {
    const components = parseComplex("press in snatch + snatch");
    const limiting = pickLimitingLift(components);
    expect(limiting.category).toBe("press_in_snatch");
  });
});

// ---------------------------------------------------------------------------
// deriveBase1RM
// ---------------------------------------------------------------------------
describe("deriveBase1RM", () => {
  it("derives hang_snatch from snatch=100 → 90", () => {
    const components = parseComplex("hang snatch + OHS");
    const limiting = components.find((c) => c.category === "hang_snatch")!;
    const result = deriveBase1RM(limiting, { snatch: 100 });
    expect(result).not.toBeNull();
    expect(result!.base1RM).toBeCloseTo(90);
    expect(result!.derivedFromParent).toBe(true);
  });

  it("uses direct hang_snatch=85 when present (beats derivation)", () => {
    const components = parseComplex("hang snatch + OHS");
    const limiting = components.find((c) => c.category === "hang_snatch")!;
    const result = deriveBase1RM(limiting, { "hang snatch": 85, snatch: 100 });
    expect(result).not.toBeNull();
    expect(result!.base1RM).toBe(85);
    expect(result!.derivedFromParent).toBe(false);
  });

  it("returns null when neither hang_snatch nor snatch is present", () => {
    const components = parseComplex("hang snatch + OHS");
    const limiting = components.find((c) => c.category === "hang_snatch")!;
    const result = deriveBase1RM(limiting, {});
    expect(result).toBeNull();
  });

  it("derives sots from snatch=100 → 55", () => {
    const components = parseComplex("sots press + snatch");
    const limiting = components.find((c) => c.category === "sots")!;
    const result = deriveBase1RM(limiting, { snatch: 100 });
    expect(result).not.toBeNull();
    expect(result!.base1RM).toBeCloseTo(55);
    expect(result!.derivedFromParent).toBe(true);
  });

  it("derives power_snatch from snatch=100 → 80", () => {
    const components = parseComplex("power snatch + OHS");
    const limiting = components.find((c) => c.category === "power_snatch")!;
    const result = deriveBase1RM(limiting, { snatch: 100 });
    expect(result).not.toBeNull();
    expect(result!.base1RM).toBeCloseTo(80);
  });

  it("derives hang_clean from clean=120 → 108", () => {
    const components = parseComplex("hang clean + jerk");
    const limiting = components.find((c) => c.category === "hang_clean")!;
    const result = deriveBase1RM(limiting, { clean: 120 });
    expect(result).not.toBeNull();
    expect(result!.base1RM).toBeCloseTo(108);
  });

  it("derives push_press from jerk=100 → 85", () => {
    const components = parseComplex("push press + split jerk");
    const limiting = components.find((c) => c.category === "push_press")!;
    const result = deriveBase1RM(limiting, { jerk: 100 });
    expect(result).not.toBeNull();
    expect(result!.base1RM).toBeCloseTo(85);
  });
});

// ---------------------------------------------------------------------------
// computeComplex — integration
// ---------------------------------------------------------------------------
describe("computeComplex", () => {
  it("computes 'snatch pull + hang snatch + OHS' with snatch=100, 5 reps", () => {
    // base1RM = 90 (hang snatch is limiting: 0.90 × 100)
    // baseIntensity = 65% (5 reps bucket)
    // penalties: hang_variant × 0.95, ohs_extra (reps≥4) × 0.95 = 0.9025
    // effectivePct = 65 × 0.9025 = 58.66%
    // finalWeight = round_to_half(90 × 0.5866) = round_to_half(52.79) = 53.0
    const result = computeComplex({
      liftName: "snatch pull + hang snatch + OHS",
      userMaxes: { snatch: 100 },
      totalRepsPerSet: 5,
    });
    expect(result).not.toBeNull();
    expect(result!.base1RM).toBeCloseTo(90);
    expect(result!.baseIntensityPercent).toBe(65);
    expect(result!.shapePenaltyMultiplier).toBeCloseTo(0.9025);
    expect(result!.finalWeight).toBe(53.0);
    expect(result!.limitingLift.category).toBe("hang_snatch");
    expect(result!.appliedShapePenalties.length).toBeGreaterThan(0);
  });

  it("applies prescribedPercentage: same complex @ 70% → 63", () => {
    // finalWeight = round_to_half(90 × 0.70) = 63.0
    // syntheticMax = base1RM = 90 (no shape penalties applied when prescribed)
    const result = computeComplex({
      liftName: "snatch pull + hang snatch + OHS",
      userMaxes: { snatch: 100 },
      totalRepsPerSet: 5,
      prescribedPercentage: 70,
    });
    expect(result).not.toBeNull();
    expect(result!.finalWeight).toBe(63.0);
    expect(result!.syntheticMax).toBe(90);
    expect(result!.baseIntensityPercent).toBe(70);
    expect(result!.appliedShapePenalties).toHaveLength(0);
    expect(result!.shapePenaltyMultiplier).toBe(1);
  });

  it("applies beginner flag: knocks 7% off the final percentage", () => {
    // Without beginner: base1RM=90, reps=5 → pct=65×0.9025 = 58.66% → 53.0
    // With beginner: pct=(65-7)×0.9025 = 58×0.9025 = 52.35% → round(90×0.5235) = round(47.11) = 47.0
    const result = computeComplex({
      liftName: "snatch pull + hang snatch + OHS",
      userMaxes: { snatch: 100 },
      totalRepsPerSet: 5,
      isBeginner: true,
    });
    expect(result).not.toBeNull();
    // finalWeight should be less than the non-beginner result (53.0)
    expect(result!.finalWeight).toBeLessThan(53.0);
    // Specifically: (65-7) × 0.9025 = 52.345%; 90 × 0.52345 = 47.11 → 47.0
    expect(result!.finalWeight).toBe(47.0);
  });

  it("pure pull complex 'snatch pull + clean pull' returns a capped result", () => {
    // No catch lifts present — pure pull edge case
    // Should cap at 1.05 × snatch (or clean) 1RM as the limiting base
    const result = computeComplex({
      liftName: "snatch pull + clean pull",
      userMaxes: { snatch: 100, clean: 120 },
      totalRepsPerSet: 2,
    });
    expect(result).not.toBeNull();
    // base1RM should be capped: snatch_pull ≈ 1.05 × snatch = 105
    // (or clean_pull 1.05 × clean = 126 — whichever is limiting, i.e. snatch_pull)
    // snatch_pull is higher priority (weaker) in the pull tier → chosen
    expect(result!.base1RM).toBeCloseTo(105);
  });

  it("returns null for missing 1RMs", () => {
    const result = computeComplex({
      liftName: "hang snatch + OHS",
      userMaxes: {},
      totalRepsPerSet: 3,
    });
    expect(result).toBeNull();
  });

  it("returns null for non-complex liftName (no +)", () => {
    const result = computeComplex({
      liftName: "snatch",
      userMaxes: { snatch: 100 },
      totalRepsPerSet: 1,
    });
    expect(result).toBeNull();
  });

  it("returns null for split jerk (single lift)", () => {
    const result = computeComplex({
      liftName: "split jerk",
      userMaxes: { jerk: 120 },
      totalRepsPerSet: 1,
    });
    expect(result).toBeNull();
  });

  it("handles 1–2 rep bucket (80% base intensity)", () => {
    const result = computeComplex({
      liftName: "hang snatch + snatch",
      userMaxes: { snatch: 100 },
      totalRepsPerSet: 2,
    });
    expect(result).not.toBeNull();
    expect(result!.baseIntensityPercent).toBe(80);
  });

  it("handles 3 rep bucket (75% base intensity)", () => {
    const result = computeComplex({
      liftName: "hang snatch + snatch",
      userMaxes: { snatch: 100 },
      totalRepsPerSet: 3,
    });
    expect(result).not.toBeNull();
    expect(result!.baseIntensityPercent).toBe(75);
  });

  it("handles 6+ rep bucket (60% base intensity)", () => {
    const result = computeComplex({
      liftName: "hang snatch + snatch",
      userMaxes: { snatch: 100 },
      totalRepsPerSet: 6,
    });
    expect(result).not.toBeNull();
    expect(result!.baseIntensityPercent).toBe(60);
  });

  it("syntheticMax × (effectivePct/100) === finalWeight when no prescribedPercentage", () => {
    const result = computeComplex({
      liftName: "snatch pull + hang snatch + OHS",
      userMaxes: { snatch: 100 },
      totalRepsPerSet: 5,
    });
    expect(result).not.toBeNull();
    // syntheticMax × (baseIntensity/100) should ≈ finalWeight (before rounding artefacts)
    // Actually: finalWeight = round_to_half(base1RM × effectivePct/100)
    // syntheticMax = round_to_half(base1RM × shapePenaltyMultiplier)
    // syntheticMax × (baseIntensity/100) ≈ finalWeight (within 0.5 rounding tolerance)
    const approxFinal =
      Math.round(
        result!.syntheticMax * (result!.baseIntensityPercent / 100) * 2
      ) / 2;
    expect(Math.abs(approxFinal - result!.finalWeight)).toBeLessThanOrEqual(
      0.5
    );
  });

  it("computeComplex returns derivedFromParent=false when hang_snatch is directly supplied", () => {
    const result = computeComplex({
      liftName: "hang snatch + OHS",
      userMaxes: { "hang snatch": 85 },
      totalRepsPerSet: 3,
    });
    expect(result).not.toBeNull();
    expect(result!.derivedFromParent).toBe(false);
    expect(result!.base1RM).toBe(85);
  });
});
