import { describe, it, expect } from "vitest";
import { pickNextTour, markTourSeenLocal } from "./tour";

describe("pickNextTour", () => {
  it("returns 'onboarding-v1' for a brand-new user", () => {
    expect(pickNextTour([], false)).toBe("onboarding-v1");
  });

  it("returns 'custom-programming-v1' for a user who finished onboarding but hasn't seen it", () => {
    expect(pickNextTour(["onboarding-v1"], true)).toBe("custom-programming-v1");
  });

  it("returns null when both tours seen", () => {
    expect(pickNextTour(["onboarding-v1", "custom-programming-v1"], true)).toBeNull();
  });

  it("returns 'onboarding-v1' even if custom-programming-v1 was somehow seen but onboarding wasn't", () => {
    // edge case — should never happen in practice but the function must be deterministic
    expect(pickNextTour(["custom-programming-v1"], false)).toBe("onboarding-v1");
  });
});

describe("markTourSeenLocal", () => {
  it("appends the tour id", () => {
    expect(markTourSeenLocal([], "onboarding-v1")).toEqual(["onboarding-v1", "custom-programming-v1"]);
  });

  it("dedupes", () => {
    expect(markTourSeenLocal(["onboarding-v1"], "onboarding-v1")).toEqual(["onboarding-v1", "custom-programming-v1"]);
  });

  it("for 'onboarding-v1' also marks 'custom-programming-v1'", () => {
    expect(markTourSeenLocal([], "onboarding-v1")).toEqual(["onboarding-v1", "custom-programming-v1"]);
  });
});
