import { describe, it, expect } from "vitest";
import { validatePersonalisation, parseAndValidateLLMResponse } from "./validator";
import type { DraftSession, LLMPersonalisation } from "./types";

const draft: DraftSession[] = [
  { sessionIndex: 0, drillId: 100, skillId: 10, courseName: "C1", drillTitle: "T1", plannedDate: "2026-05-19", plannedSlotMinutes: 30, primaryMovementPatterns: ["pull"] },
  { sessionIndex: 1, drillId: 101, skillId: 11, courseName: "C2", drillTitle: "T2", plannedDate: "2026-05-21", plannedSlotMinutes: 30, primaryMovementPatterns: ["press"] },
];

// Maps used by the validator to enforce hard constraints
const allowedDrillsBySkill = new Map<number, number[]>([[10, [100, 200]], [11, [101, 201]]]);
const drillMinutes = new Map<number, number>([[100, 25], [101, 25], [200, 25], [201, 35]]);
const drillSkill = new Map<number, number>([[100, 10], [101, 11], [200, 10], [201, 11]]);

const env = { allowedDrillsBySkill, drillMinutes, drillSkill };

describe("validatePersonalisation", () => {
  it("accepts a well-formed personalisation", () => {
    const p: LLMPersonalisation = {
      intro: "Nice plan.",
      sessionRationales: [{ sessionIndex: 0, rationale: "build base" }],
      swaps: [{ sessionIndex: 1, newDrillId: 201, reason: "harder" }],
    };
    const r = validatePersonalisation(p, draft, env);
    expect(r.intro).toBe("Nice plan.");
    expect(r.swaps).toHaveLength(0); // 201 = 35 mins > 30 slot, swap dropped
  });

  it("drops a swap whose new drill is not in the user's selected skill set", () => {
    const p: LLMPersonalisation = {
      intro: "",
      sessionRationales: [],
      swaps: [{ sessionIndex: 0, newDrillId: 999, reason: "random" }],
    };
    expect(validatePersonalisation(p, draft, env).swaps).toHaveLength(0);
  });

  it("drops a swap whose new drill belongs to a different skill than the original", () => {
    const p: LLMPersonalisation = {
      intro: "",
      sessionRationales: [],
      swaps: [{ sessionIndex: 0, newDrillId: 101, reason: "wrong skill" }], // session 0 is skill 10, drill 101 is skill 11
    };
    expect(validatePersonalisation(p, draft, env).swaps).toHaveLength(0);
  });

  it("drops a swap whose new drill exceeds slot minutes", () => {
    const p: LLMPersonalisation = {
      intro: "",
      sessionRationales: [],
      swaps: [{ sessionIndex: 1, newDrillId: 201, reason: "too long" }], // 35 > 30
    };
    expect(validatePersonalisation(p, draft, env).swaps).toHaveLength(0);
  });

  it("drops a swap with out-of-range sessionIndex", () => {
    const p: LLMPersonalisation = {
      intro: "",
      sessionRationales: [],
      swaps: [{ sessionIndex: 99, newDrillId: 101, reason: "bad index" }],
    };
    expect(validatePersonalisation(p, draft, env).swaps).toHaveLength(0);
  });

  it("drops a rationale with out-of-range sessionIndex", () => {
    const p: LLMPersonalisation = {
      intro: "",
      sessionRationales: [{ sessionIndex: 99, rationale: "ghost" }],
      swaps: [],
    };
    expect(validatePersonalisation(p, draft, env).sessionRationales).toHaveLength(0);
  });
});

describe("parseAndValidateLLMResponse", () => {
  it("throws on non-JSON input", () => {
    expect(() => parseAndValidateLLMResponse("not json", draft, env)).toThrow();
  });

  it("throws when required fields are missing", () => {
    expect(() => parseAndValidateLLMResponse(JSON.stringify({ intro: "x" }), draft, env)).toThrow();
  });

  it("succeeds on a minimal valid payload", () => {
    const r = parseAndValidateLLMResponse(
      JSON.stringify({ intro: "hi", sessionRationales: [], swaps: [] }),
      draft,
      env
    );
    expect(r.intro).toBe("hi");
  });
});
