import { describe, it, expect } from "vitest";
import {
  movementGapSignal,
  rpeFlagSignal,
  frequencyGapSignal,
  failedCompletionSignal,
  rankSignals,
} from "./weakness";

describe("movementGapSignal", () => {
  it("flags a skill the user has never logged Rx for", () => {
    const result = movementGapSignal({
      skillId: 1,
      skillName: "Ring Muscle Up",
      rxCount: 0,
      programmedCount: 12,
    });
    expect(result).not.toBeNull();
    expect(result!.signalStrength).toBeGreaterThan(0.5);
    expect(result!.reason).toContain("never logged Rx");
  });

  it("returns null when the user has logged Rx", () => {
    const result = movementGapSignal({
      skillId: 1,
      skillName: "Ring Muscle Up",
      rxCount: 3,
      programmedCount: 12,
    });
    expect(result).toBeNull();
  });

  it("returns null when never programmed", () => {
    expect(movementGapSignal({ skillId: 1, skillName: "X", rxCount: 0, programmedCount: 0 })).toBeNull();
  });
});

describe("rpeFlagSignal", () => {
  it("flags average RPE > 8.5 over last 30 days", () => {
    const r = rpeFlagSignal({ skillId: 2, pattern: "overhead", avgRpe: 9.0, sampleSize: 10 });
    expect(r).not.toBeNull();
    expect(r!.reason).toContain("overhead");
  });

  it("does not flag avg RPE below threshold", () => {
    expect(rpeFlagSignal({ skillId: 2, pattern: "overhead", avgRpe: 8.0, sampleSize: 10 })).toBeNull();
  });

  it("requires minimum sample size", () => {
    expect(rpeFlagSignal({ skillId: 2, pattern: "overhead", avgRpe: 9.5, sampleSize: 2 })).toBeNull();
  });
});

describe("frequencyGapSignal", () => {
  it("flags when no gymnastics in 14d but 3+ CrossFit sessions logged", () => {
    const r = frequencyGapSignal({ skillId: 3, gymnasticsCount14d: 0, crossfitCount14d: 4 });
    expect(r).not.toBeNull();
  });

  it("does not flag when gymnastics work is present", () => {
    expect(frequencyGapSignal({ skillId: 3, gymnasticsCount14d: 2, crossfitCount14d: 4 })).toBeNull();
  });
});

describe("failedCompletionSignal", () => {
  it("flags a failed completion in a WOD with a matching gymnastics movement", () => {
    const r = failedCompletionSignal({
      skillId: 4,
      wodName: "Fran",
      movement: "Ring Muscle Up",
      roundsCompleted: 2,
      prescribedRounds: 5,
    });
    expect(r).not.toBeNull();
    expect(r!.reason).toContain("Fran");
  });

  it("returns null when fully completed", () => {
    expect(
      failedCompletionSignal({
        skillId: 4,
        wodName: "Fran",
        movement: "Pull Up",
        roundsCompleted: 5,
        prescribedRounds: 5,
      })
    ).toBeNull();
  });

  it("returns null when prescribedRounds is zero (guard against divide by zero)", () => {
    expect(
      failedCompletionSignal({
        skillId: 4,
        wodName: "Fran",
        movement: "Pull Up",
        roundsCompleted: 0,
        prescribedRounds: 0,
      })
    ).toBeNull();
  });
});

describe("rankSignals", () => {
  it("sorts by signalStrength descending and dedupes by skillId", () => {
    const out = rankSignals([
      { skillId: 1, signalStrength: 0.6, reason: "a" },
      { skillId: 1, signalStrength: 0.9, reason: "b" },
      { skillId: 2, signalStrength: 0.4, reason: "c" },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ skillId: 1, signalStrength: 0.9, reason: "b" });
    expect(out[1]).toMatchObject({ skillId: 2 });
  });
});
