import { describe, it, expect } from "vitest"
import { classifyMovements } from "./movement-patterns"

describe("classifyMovements", () => {
  it("classifies a ring muscle up as pull + press", () => {
    expect(classifyMovements(["Ring Muscle Up"])).toEqual(expect.arrayContaining(["pull", "press"]))
  })

  it("classifies handstand walk as press + overhead", () => {
    expect(classifyMovements(["Handstand Walk"])).toEqual(expect.arrayContaining(["press", "overhead"]))
  })

  it("classifies double unders as conditioning + jump", () => {
    expect(classifyMovements(["50 Double Unders"])).toEqual(expect.arrayContaining(["conditioning", "jump"]))
  })

  it("classifies toes to bar as pull + core", () => {
    expect(classifyMovements(["Toes To Bar x10"])).toEqual(expect.arrayContaining(["pull", "core"]))
  })

  it("classifies pistol as squat + unilateral", () => {
    expect(classifyMovements(["Pistol Squat"])).toEqual(expect.arrayContaining(["squat", "unilateral"]))
  })

  it("deduplicates patterns across multiple movements", () => {
    const out = classifyMovements(["Ring Muscle Up", "Bar Muscle Up"])
    expect(out.filter((p) => p === "pull")).toHaveLength(1)
    expect(out.filter((p) => p === "press")).toHaveLength(1)
  })

  it("returns empty array for unmatched movement", () => {
    expect(classifyMovements(["Walk to the bathroom"])).toEqual([])
  })

  it("matches the EMOM/AMRAP prefix without misclassifying as a movement", () => {
    // "EMOM 10" is structural, not a movement — must not match anything
    expect(classifyMovements(["EMOM 10:"])).toEqual([])
  })

  it("does not classify 'Bent-over Row' as conditioning (strength row, not erg)", () => {
    expect(classifyMovements(["Bent-over Row"])).toEqual([]);
  });

  it("does not classify 'Bench Press' as overhead (horizontal press)", () => {
    expect(classifyMovements(["Bench Press"])).toEqual(
      expect.not.arrayContaining(["overhead"])
    );
  });

  it("classifies 'Rowing 500m' as conditioning (erg context)", () => {
    expect(classifyMovements(["Rowing 500m"])).toEqual(expect.arrayContaining(["conditioning"]));
  });

  it("classifies 'Running 1km' as conditioning (gerund form)", () => {
    expect(classifyMovements(["Running 1km"])).toEqual(expect.arrayContaining(["conditioning"]));
  });
})
